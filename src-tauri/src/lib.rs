use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::{DialogExt, FilePath};

#[derive(Default)]
struct HostState {
    authorized: Mutex<HashSet<PathBuf>>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct OpenOptions {
    #[serde(default)]
    multiple: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WireArtifact {
    kind: String,
    name: String,
    #[serde(default)]
    mime: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    ext: String,
    #[serde(default)]
    meta: serde_json::Value,
    encoding: String,
    data: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedText {
    name: String,
    text: String,
    locator: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PickedAsset {
    name: String,
    mime: String,
    locator: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedArtifact {
    mode: &'static str,
    name: String,
    locator: String,
}

fn file_path(value: FilePath) -> Result<PathBuf, String> {
    value
        .into_path()
        .map_err(|_| "仅支持桌面文件路径".to_string())
}

fn canonical_existing(path: &Path) -> Result<PathBuf, String> {
    path.canonicalize()
        .map_err(|error| format!("无法定位文件 {}：{error}", path.display()))
}

fn authorize(state: &State<'_, HostState>, path: &Path) -> Result<PathBuf, String> {
    let path = canonical_existing(path)?;
    state
        .authorized
        .lock()
        .map_err(|_| "文件授权状态不可用".to_string())?
        .insert(path.clone());
    Ok(path)
}

fn require_authorized(state: &State<'_, HostState>, locator: &str) -> Result<PathBuf, String> {
    let path = canonical_existing(Path::new(locator))?;
    let authorized = state
        .authorized
        .lock()
        .map_err(|_| "文件授权状态不可用".to_string())?;
    if authorized.contains(&path) {
        Ok(path)
    } else {
        Err("该路径尚未由用户授权".to_string())
    }
}

fn mime_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "json" => "application/json",
        "js" => "text/javascript",
        "html" => "text/html",
        _ => "application/octet-stream",
    }
}

fn data_url(path: &Path) -> Result<String, String> {
    let data = fs::read(path).map_err(|error| format!("无法读取 {}：{error}", path.display()))?;
    Ok(format!(
        "data:{};base64,{}",
        mime_for(path),
        BASE64.encode(data)
    ))
}

fn clean_name(name: &str) -> Result<String, String> {
    let path = Path::new(name);
    if name.trim().is_empty()
        || path.components().count() != 1
        || !matches!(path.components().next(), Some(Component::Normal(_)))
    {
        return Err("产物名称不安全".to_string());
    }
    Ok(name.to_string())
}

fn safe_relative_ref(value: &str) -> Result<PathBuf, String> {
    let relative = PathBuf::from(value);
    if value.trim().is_empty()
        || relative.is_absolute()
        || relative
            .components()
            .any(|part| !matches!(part, Component::Normal(_) | Component::CurDir))
    {
        return Err("素材引用必须是场景目录内的相对路径".to_string());
    }
    Ok(relative)
}

fn asset_candidates(scene_root: &Path, relative: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![scene_root.join(relative)];
    // Early example scenes used repository-root-looking refs such as
    // `examples/assets/a.png` while the scene itself already lives in
    // `examples/`. Treat one duplicated leading directory as a legacy alias,
    // but never search ancestors or relax the scene-directory sandbox.
    if let (Some(root_name), Some(Component::Normal(first))) =
        (scene_root.file_name(), relative.components().next())
    {
        if first == root_name {
            if let Ok(stripped) = relative.strip_prefix(Path::new(root_name)) {
                let legacy = scene_root.join(stripped);
                if legacy != candidates[0] {
                    candidates.push(legacy);
                }
            }
        }
    }
    candidates
}

fn artifact_bytes(artifact: &WireArtifact) -> Result<Vec<u8>, String> {
    match artifact.encoding.as_str() {
        "utf8" => Ok(artifact.data.as_bytes().to_vec()),
        "base64" => BASE64
            .decode(&artifact.data)
            .map_err(|error| format!("产物 base64 无效：{error}")),
        _ => Err("不支持的产物编码".to_string()),
    }
}

fn atomic_write(path: &Path, data: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "目标目录无效".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("无法创建目标目录：{error}"))?;
    let mut temp = parent.join(format!(
        ".{}.patcharium-tmp",
        path.file_name()
            .and_then(|v| v.to_str())
            .unwrap_or("artifact")
    ));
    let mut suffix = 0u32;
    while temp.exists() {
        suffix += 1;
        temp = parent.join(format!(".patcharium-{suffix}.tmp"));
    }
    let result = (|| -> Result<(), String> {
        let mut file =
            fs::File::create(&temp).map_err(|error| format!("无法创建临时文件：{error}"))?;
        file.write_all(data)
            .map_err(|error| format!("无法写入临时文件：{error}"))?;
        file.sync_all()
            .map_err(|error| format!("无法同步临时文件：{error}"))?;
        if path.exists() {
            let backup = parent.join(format!(
                ".{}.patcharium-backup",
                path.file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("artifact")
            ));
            if backup.exists() {
                fs::remove_file(&backup).map_err(|error| format!("无法清理旧备份：{error}"))?;
            }
            fs::rename(path, &backup).map_err(|error| format!("无法暂存原文件：{error}"))?;
            if let Err(error) = fs::rename(&temp, path) {
                let _ = fs::rename(&backup, path);
                return Err(format!("无法完成原子替换：{error}"));
            }
            let _ = fs::remove_file(&backup);
        } else {
            fs::rename(&temp, path).map_err(|error| format!("无法完成写入：{error}"))?;
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result
}

fn save_one(
    state: &State<'_, HostState>,
    path: PathBuf,
    artifact: &WireArtifact,
) -> Result<SavedArtifact, String> {
    let name = clean_name(&artifact.name)?;
    let bytes = artifact_bytes(artifact)?;
    atomic_write(&path, &bytes)?;
    let path = authorize(state, &path)?;
    Ok(SavedArtifact {
        mode: "direct",
        name,
        locator: path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn patcharium_open_text(
    app: AppHandle,
    state: State<'_, HostState>,
    options: Option<OpenOptions>,
) -> Result<Option<OpenedText>, String> {
    let _ = options.unwrap_or_default().multiple;
    let selected = app
        .dialog()
        .file()
        .add_filter("Patcharium Scene", &["js", "json"])
        .blocking_pick_file();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = authorize(&state, &file_path(selected)?)?;
    let text =
        fs::read_to_string(&path).map_err(|error| format!("场景必须是 UTF-8 文本：{error}"))?;
    Ok(Some(OpenedText {
        name: path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("scene.js")
            .to_string(),
        text,
        locator: path.to_string_lossy().into_owned(),
    }))
}

#[tauri::command]
fn patcharium_pick_assets(
    app: AppHandle,
    state: State<'_, HostState>,
    options: Option<OpenOptions>,
    scene_locator: Option<String>,
) -> Result<Vec<PickedAsset>, String> {
    let _ = scene_locator;
    let multiple = options.unwrap_or_default().multiple;
    let dialog = app.dialog().file().add_filter(
        "Images",
        &["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"],
    );
    let picked = if multiple {
        dialog.blocking_pick_files().unwrap_or_default()
    } else {
        dialog.blocking_pick_file().into_iter().collect()
    };
    picked
        .into_iter()
        .map(|selected| {
            let path = authorize(&state, &file_path(selected)?)?;
            Ok(PickedAsset {
                name: path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or("asset")
                    .to_string(),
                mime: mime_for(&path).to_string(),
                locator: path.to_string_lossy().into_owned(),
            })
        })
        .collect()
}

#[tauri::command]
fn patcharium_read_asset(state: State<'_, HostState>, locator: String) -> Result<String, String> {
    data_url(&require_authorized(&state, &locator)?)
}

#[tauri::command]
fn patcharium_resolve_asset(
    state: State<'_, HostState>,
    r#ref: String,
    scene_locator: String,
) -> Result<Option<String>, String> {
    if r#ref.starts_with("data:") {
        return Ok(Some(r#ref));
    }
    let scene = require_authorized(&state, &scene_locator)?;
    let root = scene
        .parent()
        .ok_or_else(|| "场景所在目录无效".to_string())?;
    let relative = safe_relative_ref(&r#ref)?;
    let Some(candidate) = asset_candidates(root, &relative)
        .into_iter()
        .find(|path| path.exists())
    else {
        return Ok(None);
    };
    let candidate = canonical_existing(&candidate)?;
    let root = canonical_existing(root)?;
    if !candidate.starts_with(&root) {
        return Err("素材引用越过了场景目录".to_string());
    }
    let candidate = authorize(&state, &candidate)?;
    Ok(Some(data_url(&candidate)?))
}

#[tauri::command]
fn patcharium_save_artifact(
    app: AppHandle,
    state: State<'_, HostState>,
    artifact: WireArtifact,
    scene_locator: Option<String>,
    write_back: bool,
) -> Result<Option<SavedArtifact>, String> {
    let _ = (
        &artifact.mime,
        &artifact.description,
        &artifact.ext,
        &artifact.meta,
    );
    let target = if write_back && artifact.kind == "scene" {
        scene_locator
            .as_deref()
            .map(|locator| require_authorized(&state, locator))
            .transpose()?
    } else {
        None
    };
    let target = match target {
        Some(path) => path,
        None => {
            let name = clean_name(&artifact.name)?;
            let mut dialog = app.dialog().file().set_file_name(&name);
            if let Some(ext) = Path::new(&name)
                .extension()
                .and_then(|value| value.to_str())
            {
                dialog = dialog.add_filter("Artifact", &[ext]);
            }
            let Some(selected) = dialog.blocking_save_file() else {
                return Ok(None);
            };
            file_path(selected)?
        }
    };
    Ok(Some(save_one(&state, target, &artifact)?))
}

#[tauri::command]
fn patcharium_save_artifacts(
    app: AppHandle,
    state: State<'_, HostState>,
    artifacts: Vec<WireArtifact>,
    scene_locator: Option<String>,
) -> Result<Vec<SavedArtifact>, String> {
    let _ = scene_locator;
    if artifacts.is_empty() {
        return Ok(Vec::new());
    }
    let Some(selected) = app.dialog().file().blocking_pick_folder() else {
        return Ok(Vec::new());
    };
    let directory = file_path(selected)?;
    artifacts
        .iter()
        .map(|artifact| {
            let name = clean_name(&artifact.name)?;
            save_one(&state, directory.join(name), artifact)
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(HostState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            patcharium_open_text,
            patcharium_save_artifact,
            patcharium_save_artifacts,
            patcharium_pick_assets,
            patcharium_read_asset,
            patcharium_resolve_asset
        ])
        .run(tauri::generate_context!())
        .expect("Patcharium desktop host failed");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn artifact_name_must_be_one_safe_component() {
        assert!(clean_name("scene.js").is_ok());
        assert!(clean_name("frame 001.png").is_ok());
        assert!(clean_name("").is_err());
        assert!(clean_name("../scene.js").is_err());
        assert!(clean_name("folder/scene.js").is_err());
        assert!(clean_name("C:\\temp\\scene.js").is_err());
    }

    #[test]
    fn asset_ref_cannot_escape_scene_directory() {
        assert_eq!(
            safe_relative_ref("assets/picture.png").unwrap(),
            PathBuf::from("assets/picture.png")
        );
        assert!(safe_relative_ref("../secret.png").is_err());
        assert!(safe_relative_ref("/absolute.png").is_err());
        assert!(safe_relative_ref("C:\\absolute.png").is_err());
        assert!(safe_relative_ref("").is_err());
    }

    #[test]
    fn asset_candidates_support_scene_relative_and_legacy_prefixed_refs() {
        let root = Path::new("project").join("examples");
        assert_eq!(
            asset_candidates(&root, Path::new("assets/picture.png")),
            vec![root.join("assets/picture.png")]
        );
        assert_eq!(
            asset_candidates(&root, Path::new("examples/assets/picture.png")),
            vec![
                root.join("examples/assets/picture.png"),
                root.join("assets/picture.png")
            ]
        );
    }

    #[test]
    fn wire_artifact_decodes_text_and_binary() {
        let mut artifact = WireArtifact {
            kind: "scene".into(),
            name: "scene.js".into(),
            mime: "text/javascript".into(),
            description: String::new(),
            ext: "js".into(),
            meta: serde_json::Value::Null,
            encoding: "utf8".into(),
            data: "你好".into(),
        };
        assert_eq!(artifact_bytes(&artifact).unwrap(), "你好".as_bytes());
        artifact.encoding = "base64".into();
        artifact.data = BASE64.encode([0u8, 1, 2, 255]);
        assert_eq!(artifact_bytes(&artifact).unwrap(), vec![0, 1, 2, 255]);
    }
}
