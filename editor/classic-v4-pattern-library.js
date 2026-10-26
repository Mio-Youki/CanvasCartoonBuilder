/* Shared shelf shell; one mounted catalogue owns all pattern UI. */
(function(global){
  'use strict';
  function create(options){
    const {workspace,view,drawing}=options,root=options.root||document,pane=root.getElementById('asset-pane'),head=root.getElementById('asset-head'),assets=root.getElementById('side-import'),imports=pane.querySelector('.asset-import-actions'),title=head.querySelector('.asset-title');
    const toolbar=root.createElement('button');toolbar.id='toolbar-pattern';toolbar.type='button';toolbar.className='small';toolbar.textContent='▧';toolbar.title='图样';toolbar.setAttribute('aria-label','图样');root.getElementById('toolbar-image').after(toolbar);
    const tabs=root.createElement('span');tabs.className='v4-library-tabs';tabs.setAttribute('role','tablist');
    for(const [label,id]of [['素材','assets'],['图样','patterns']]){const b=root.createElement('button');b.type='button';b.textContent=label;b.dataset.libraryTab=id;b.setAttribute('role','tab');tabs.append(b);}title.replaceWith(tabs);
    const host=root.createElement('div');host.id='v4-pattern-library';host.className='asset-content';host.hidden=true;host.setAttribute('role','tabpanel');host.setAttribute('aria-label','图样');pane.append(host);
    let shelf='assets',catalogue=null,stopped=false,project=workspace.moduleScope;const extra=new Map();
    function render(){if(!stopped)catalogue?.render();}
    function setShelf(next){shelf=next;assets.hidden=next!=='assets';imports.hidden=next!=='assets';host.hidden=next!=='patterns';pane.dataset.library=next;
      for(const b of tabs.querySelectorAll('[data-library-tab]'))b.setAttribute('aria-selected',String(next===b.dataset.libraryTab));
      for(const [id,item]of extra){item.host.hidden=id!==next;if(id===next)item.onOpen();}
      toolbar.classList.toggle('active',next==='patterns'&&pane.classList.contains('open'));if(next==='patterns')render();
    }
    function open(next){pane.classList.add('open');root.getElementById('effect-pane')?.classList.remove('open');if(next==='patterns')catalogue?.onOpen?.();setShelf(next);}
    function mount(controller){host.replaceChildren(controller.node);catalogue=controller;render();return()=>{if(catalogue===controller){catalogue=null;host.replaceChildren();}};}
    function registerShelf(id,label,element,onOpen){
      if(['assets','patterns'].includes(id)||extra.has(id))throw Error('资源栏入口重复');const b=root.createElement('button');b.type='button';b.textContent=label;b.dataset.libraryTab=id;b.setAttribute('role','tab');b.setAttribute('aria-selected','false');tabs.append(b);element.hidden=true;pane.append(element);extra.set(id,{host:element,onOpen:onOpen||(()=>{})});
      return()=>{if(shelf===id)setShelf('assets');extra.delete(id);b.remove();element.remove();};
    }
    function tabClick(e){const b=e.target.closest('[data-library-tab]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open(b.dataset.libraryTab);}
    function patternClick(e){e.preventDefault();e.stopImmediatePropagation();open('patterns');}function imageClick(){open('assets');}
    head.addEventListener('click',tabClick,true);toolbar.addEventListener('click',patternClick);root.getElementById('toolbar-image').addEventListener('click',imageClick,true);
    for(const b of imports.querySelectorAll('button'))b.addEventListener('click',imageClick);
    const observer=new MutationObserver(()=>toolbar.classList.toggle('active',shelf==='patterns'&&pane.classList.contains('open')));observer.observe(pane,{attributes:true,attributeFilter:['class']});
    const offSelection=view.subscribeSelection(()=>{drawing.cancelPattern?.();render();}),offWorkspace=workspace.subscribe(()=>{if(project!==workspace.moduleScope){project=workspace.moduleScope;drawing.cancelPattern?.();}render();});setShelf('assets');
    function stop(){stopped=true;observer.disconnect();offSelection();offWorkspace();head.removeEventListener('click',tabClick,true);toolbar.removeEventListener('click',patternClick);root.getElementById('toolbar-image')?.removeEventListener('click',imageClick,true);for(const b of imports.querySelectorAll('button'))b.removeEventListener('click',imageClick);catalogue?.stop?.();host.remove();toolbar.remove();tabs.replaceWith(title);assets.hidden=false;imports.hidden=false;delete pane.dataset.library;drawing.cancelPattern?.();}
    return Object.freeze({open,render,mount,stop,registerShelf,get shelf(){return shelf;}});
  }
  global.EditorClassicV4PatternLibrary=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
