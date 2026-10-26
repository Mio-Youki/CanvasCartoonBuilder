/* Card-owned baking UI: snapshot in, atomic bitmap/sequence material out. */
(function(global){
  'use strict';
  function create(options){
    const {workspace,changes}=options,root=options.root||document,baker=global.EditorV4MaterialBaker;
    let current=null,stopped=false;const pending=new Set();
    function close(){const item=current;if(!item)return;current=null;item.abort.abort();item.preview?.dispose?.();item.dialog.close();item.dialog.remove();item.off();if(item.opener?.isConnected)item.opener.focus();}
    async function open(id,opener){
      if(stopped)return;close();
      const original=workspace.current(),revision=workspace.revision,scope=workspace.moduleScope,snapshot=JSON.parse(JSON.stringify(original));snapshot._moduleScope=scope;
      const preset=snapshot.elementPresets?.[id];if(!preset)throw Error('元素素材已不存在');
      const dialog=root.createElement('dialog'),title=root.createElement('h2'),form=root.createElement('form'),canvas=root.createElement('canvas'),mode=root.createElement('select'),time=root.createElement('input'),frames=root.createElement('input'),summary=root.createElement('div'),message=root.createElement('div'),progress=root.createElement('progress'),actions=root.createElement('div'),start=root.createElement('button'),cancel=root.createElement('button');
      dialog.className='v4-material-bake-dialog';dialog.dataset.materialBakeDialog='';dialog.setAttribute('aria-label','烘焙元素素材');title.textContent='烘焙 · '+preset.name;
      canvas.width=320;canvas.height=192;canvas.className='v4-material-bake-preview';canvas.setAttribute('aria-label','素材预览');
      for(const [value,label]of [['freeze','位图'],['sequence','序列']]){const option=root.createElement('option');option.value=value;option.textContent=label;mode.append(option);}mode.dataset.bakeMode='';
      time.type='number';time.min='0';time.step='.01';time.value=String(Math.max(0,+options.time?.()||0));time.dataset.bakeTime='';
      frames.type='number';frames.min='2';frames.max=String(global.EditorV4ModuleBaker.limits.frames);frames.step='1';frames.value=String(Math.max(2,Math.min(120,Math.round(snapshot.loop*12))));frames.dataset.bakeFrames='';
      function field(label,input){const node=root.createElement('label'),text=root.createElement('span');node.className='global-field';text.textContent=label;node.append(text,input);form.append(node);return node;}
      field('输出',mode);const timeField=field('画面时刻',time),framesField=field('周期帧数',frames);
      summary.className='v4-material-bake-summary';message.className='v4-resource-message';message.setAttribute('role','status');progress.max=1;progress.value=0;progress.hidden=true;
      actions.className='row';start.type='submit';start.className='primary';start.textContent='烘焙入库';start.dataset.bakeStart='';start.disabled=true;cancel.type='button';cancel.textContent='关闭';cancel.onclick=close;actions.append(start,cancel);form.append(summary,progress,message,actions);dialog.append(title,canvas,form);root.body.append(dialog);
      const item={dialog,abort:new AbortController(),opener:opener||root.activeElement,preview:null,off:()=>{},busy:false};current=item;
      const ensure=()=>{if(stopped||current!==item||workspace.current()!==original||workspace.revision!==revision||workspace.moduleScope!==scope)throw Error('工程已变化，未添加烘焙素材');if(item.abort.signal.aborted)throw Error('已取消，未添加素材');};
      item.off=workspace.subscribe(()=>{if(workspace.current()!==original||workspace.revision!==revision)close();});
      dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}});dialog.showModal();mode.focus();
      let prepared;
      function plan(){
        if(current!==item||item.busy)return;timeField.hidden=time.disabled=mode.value!=='freeze';framesField.hidden=frames.disabled=mode.value!=='sequence';
        try{ensure();prepared=baker.prepare(snapshot,id,{mode:mode.value,time:+time.value,frames:mode.value==='sequence'?+frames.value:undefined});const value=prepared.plan;summary.textContent=value.width+'×'+value.height+' · '+value.count+' 帧'+(value.count>1?' · '+value.fps.toFixed(2)+'fps':'');message.textContent='';start.disabled=false;item.preview?.draw(canvas,+time.value||0);}
        catch(error){prepared=null;start.disabled=true;message.textContent=error.message;message.setAttribute('role','alert');}
      }
      for(const input of [mode,time,frames])input.addEventListener('input',plan);
      form.onsubmit=event=>{event.preventDefault();if(item.busy||!prepared)return;
        const task=(async()=>{item.busy=true;start.disabled=true;mode.disabled=time.disabled=frames.disabled=true;progress.hidden=false;cancel.textContent='取消';message.textContent='正在烘焙…';message.setAttribute('role','status');
          try{ensure();const result=await baker.render(prepared,{signal:item.abort.signal,assetOptions:{sceneLocator:workspace.locator},assertCurrent:ensure,onProgress:value=>{if(current===item){progress.value=value.completed/value.total;message.textContent=value.completed+' / '+value.total;}}});ensure();
            let added;changes.run('烘焙元素素材',scene=>{added=baker.add(scene,result);});options.onAdded?.(added.assetId);options.renderLibrary();const node=root.getElementById('m-import');node.textContent='已烘焙入库；原素材与画布对象保持不变';node.setAttribute('role','status');close();
          }catch(error){if(current===item){message.textContent=error.message;message.setAttribute('role','alert');}}
          finally{item.busy=false;if(current===item){mode.disabled=false;time.disabled=mode.value!=='freeze';frames.disabled=mode.value!=='sequence';start.disabled=!prepared;cancel.textContent='关闭';progress.hidden=true;}}
        })();pending.add(task);void task.finally(()=>pending.delete(task));
      };
      try{const ids=global.EditorV4ElementPresets.references(preset).filter(ref=>ref.kind==='module').map(ref=>ref.id);if(ids.some(moduleId=>!global.EditorV4ModuleInstances.ready(snapshot,moduleId,scope)))await global.EditorVNextModuleLoader.loadAuthorized(snapshot,ids,{scope,assertCurrent:ensure});ensure();plan();
        const preview=await global.EditorV4MaterialPreview.element(snapshot,id,{sceneLocator:workspace.locator});if(current!==item){preview.dispose?.();return;}item.preview=preview;preview.draw(canvas,+time.value||0);
      }catch(error){if(current===item){message.textContent=error.message;message.setAttribute('role','alert');}}
    }
    return Object.freeze({open,close,settled:()=>Promise.allSettled([...pending]),stop(){stopped=true;close();}});
  }
  global.EditorClassicV4MaterialBakeController=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
