(function (global) {
  'use strict';

  // This module owns only the presentational shell of an Inspector effect.
  // State mutations and Runtime wiring remain in the Inspector controller.
  function decorate(options) {
    const root=options.root,block=options.block,card=options.card,definition=options.definition;
    block.wrap.dataset.v4EffectId=card.id;
    block.wrap.classList.toggle('active',!!options.focused);
    if(!(definition.motion&&definition.motion.length))return Object.freeze({motionButton:null});
    const motionButton=root.createElement('button');
    motionButton.type='button';
    motionButton.className='v4-motion-title-button'+(options.motionActive?' active':'');
    motionButton.textContent=options.motionOpen?'动态 ▾':'动态 ▸';
    motionButton.title='展开当前效果的动态参数';
    if(typeof options.onToggleMotion==='function')motionButton.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      options.onToggleMotion();
    });
    block.heading.append(motionButton);
    return Object.freeze({motionButton});
  }

  function adopt(options) {
    const block=options.block,card=options.card;
    block.wrap.dataset.v4EffectId=card.id;
    block.wrap.classList.toggle('active',!!options.focused);
    block.wrap.dataset.v4EffectScope=options.scope||'object';
    return block;
  }

  function create(options) {
    const root=options.root,section=options.section,card=options.card,definition=options.definition;
    const block=section(card.name,card.purpose);
    const head=root.createElement('label'),label=root.createElement('span'),toggle=root.createElement('input');
    head.className='global-field wide';
    label.textContent='启用';
    toggle.type='checkbox';
    toggle.checked=!!card.enabled;
    toggle.disabled=!card.editable;
    head.append(label,toggle);
    block.grid.append(head);
    const decorated=decorate(Object.assign({},options,{block}));
    return Object.freeze({block,toggle,motionButton:decorated.motionButton});
  }

  global.EditorClassicV4InspectorEffectCard=Object.freeze({create,decorate,adopt});
})(typeof window!=='undefined'?window:globalThis);
