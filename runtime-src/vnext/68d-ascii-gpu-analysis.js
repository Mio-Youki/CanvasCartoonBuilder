/* Optional low-resolution ASCII edge analysis; shares the glyph renderer's GL.
 * Source/Alpha representatives remain CPU-owned. Votes never read back to CPU.
 */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const header = 'precision highp float;uniform sampler2D inputTex;uniform vec2 size,validEnd;uniform float threshold;';
  const sample = 'vec4 at(vec2 p){return texture2D(inputTex,(clamp(p,vec2(0.),size-1.)+.5)/size);}';
  const horizontal = header + sample + `
    void main(){vec2 p=floor(gl_FragCoord.xy);vec2 sum=vec2(0.);
      for(int k=-2;k<=2;k++){vec2 q=min(clamp(p+vec2(float(k),0.),vec2(0.),size-1.),validEnd);vec4 c=at(q);
        float l=dot(c.rgb,vec3(.2126,.7152,.0722))*c.a;
        vec2 w=vec2(exp(-float(k*k)/2.),exp(-float(k*k)/(2.*1.6*1.6)));sum+=l*w;}
      gl_FragColor=vec4(sum/vec2(2.4837318858984925,3.5608218483405576),0.,1.);}`;
  const vertical = header + sample + `
    void main(){vec2 p=floor(gl_FragCoord.xy);vec2 sum=vec2(0.);
      for(int k=-2;k<=2;k++){vec2 c=at(p+vec2(0.,float(k))).rg;
        vec2 w=vec2(exp(-float(k*k)/2.),exp(-float(k*k)/(2.*1.6*1.6)));sum+=c*w;}
      vec2 value=sum/vec2(2.4837318858984925,3.5608218483405576);
      gl_FragColor=vec4(value.x-value.y>=threshold?1.:0.,0.,0.,1.);}`;
  const gradient = header + sample + `
    void main(){vec2 p=floor(gl_FragCoord.xy);
      float a=at(p+vec2(-1.,-1.)).r,b=at(p+vec2(0.,-1.)).r,c=at(p+vec2(1.,-1.)).r;
      float d=at(p+vec2(-1.,0.)).r,e=at(p+vec2(1.,0.)).r;
      float f=at(p+vec2(-1.,1.)).r,g=at(p+vec2(0.,1.)).r,h=at(p+vec2(1.,1.)).r;
      float gx=c+2.*e+h-a-2.*d-f,gy=f+2.*g+h-a-2.*b-c,code=0.;
      if(abs(gx)+abs(gy)>0.)code=abs(gx)<abs(gy)*.4142135623730951?1.:abs(gy)<abs(gx)*.4142135623730951?2.:gx*gy>0.?3.:4.;
      gl_FragColor=vec4(code/255.,0.,0.,1.);}`;
  const vote = header + sample + `uniform float coverage;
    void main(){vec2 cell=floor(gl_FragCoord.xy);vec4 buckets=vec4(0.);
      for(int y=0;y<4;y++)for(int x=0;x<4;x++){
        float code=floor(at(cell*4.+vec2(float(x),float(y))).r*255.+.5);
        if(code==1.)buckets.x+=1.;else if(code==2.)buckets.y+=1.;else if(code==3.)buckets.z+=1.;else if(code==4.)buckets.w+=1.;}
      float best=buckets.x,code=1.;
      if(buckets.y>best){best=buckets.y;code=2.;}if(buckets.z>best){best=buckets.z;code=3.;}if(buckets.w>best){best=buckets.w;code=4.;}
      gl_FragColor=vec4((best>=max(1.,ceil(coverage*16.))?code:0.)/255.,0.,0.,1.);}`;

  function destroy(gl, state) {
    if (!state) return;
    for (const item of state.programs) gl.deleteProgram(item.program);
    for (const texture of state.textures) gl.deleteTexture(texture);
    gl.deleteFramebuffer(state.framebuffer); gl.deleteBuffer(state.buffer);
  }
  function compile(gl, fragment) {
    const program = gl.createProgram(), shaders = [];
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      return { program, locations: new Map(), position: gl.getAttribLocation(program, 'position') };
    } catch (error) { gl.deleteProgram(program); throw error; }
    finally { shaders.forEach(shader => gl.deleteShader(shader)); }
  }
  function create(gl, width, height, columns, rows) {
    const state = { width, height, columns, rows, programs: [], textures: [], framebuffer: null, buffer: null };
    try {
      for (const fragment of [horizontal, vertical, gradient, vote]) state.programs.push(compile(gl, fragment));
      // Only the paired horizontal blur needs RGBA32F. Other passes are RGBA8.
      for (let i = 0; i < 5; i++) {
        const texture = gl.createTexture(); state.textures.push(texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, key, gl.NEAREST);
        for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, i === 4 ? columns : width, i === 4 ? rows : height,
          0, gl.RGBA, i === 1 ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
      }
      state.framebuffer = gl.createFramebuffer(); state.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      return state;
    } catch (error) { destroy(gl, state); throw error; }
  }
  function analyze(gpu, pixels, width, height, columns, rows, config, validWidth, validHeight) {
    if (!gpu || gpu.gl.isContextLost() || gpu.analysisFailure) return null;
    const gl = gpu.gl;
    try {
      if (!gpu.analysisChecked) {
        if (!gl.getExtension('OES_texture_float') || !gl.getExtension('WEBGL_color_buffer_float')) throw new Error('Float framebuffer unavailable');
        if (!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) throw new Error('Fragment highp unavailable');
        gpu.analysisChecked = true;
      }
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      // Always 4x4 analysis pixels per cell, irrespective of source/grid geometry.
      if (width !== columns*4 || height !== rows*4 || width > max || height > max) return null;
      let state = gpu.analysis;
      if (!state || state.width !== width || state.height !== height) {
        destroy(gl, state); gpu.analysis = null;
        state = gpu.analysis = create(gl, width, height, columns, rows);
      }
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, state.textures[0]);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const uniform = (item, name, ...values) => {
        if (!item.locations.has(name)) item.locations.set(name, gl.getUniformLocation(item.program, name));
        const location = item.locations.get(name);
        if (values.length === 2) gl.uniform2f(location, ...values); else gl.uniform1f(location, values[0]);
      };
      gl.bindFramebuffer(gl.FRAMEBUFFER, state.framebuffer);
      gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DITHER);
      for (let pass = 0; pass < 4; pass++) {
        const item = state.programs[pass]; gl.useProgram(item.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer); gl.enableVertexAttribArray(item.position);
        gl.vertexAttribPointer(item.position, 2, gl.FLOAT, false, 0, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, state.textures[pass+1], 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete ASCII framebuffer');
        gl.viewport(0, 0, pass === 3 ? columns : width, pass === 3 ? rows : height);
        gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, state.textures[pass]);
        gl.uniform1i(gl.getUniformLocation(item.program, 'inputTex'), 4);
        uniform(item, 'size', width, height);
        uniform(item, 'validEnd', Math.max(0, Math.floor(validWidth)-1), Math.max(0, Math.floor(validHeight)-1));
        uniform(item, 'threshold', .001 + (1-clamp(finite(config.edgeSensitivity, .75), 0, 1))*.04);
        uniform(item, 'coverage', clamp(finite(config.edgeCoverage, .25), 0, 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (gl.getError() !== gl.NO_ERROR) throw new Error('ASCII GPU analysis failed');
      return state.textures[4];
    } catch (error) {
      destroy(gl, gpu.analysis); gpu.analysis = null;
      // Do not retry a known unsupported/broken path on every animation frame.
      gpu.analysisFailure = String(error.message || error); return null;
    } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  }
  function dispose(gpu) { destroy(gpu.gl, gpu.analysis); gpu.analysis = null; }
  api.modules.asciiGpuAnalysis = Object.freeze({ analyze, dispose });
})(typeof window !== 'undefined' ? window : globalThis);
