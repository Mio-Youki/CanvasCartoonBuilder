// Shared component contract for the baseline and three visual directions.
// Keep stored demo values numeric; percent signs are presentation only.
(() => {
  const $ = id => document.getElementById(id);
  const stages = {
    scalar:'compose', range:'sample', pair:'compose', angle:'sample',
    choice:'sample', toggle:'sample', color:'decor', reference:'compose',
    text:'compose', spatial:'compose', pattern:'decor'
  };
  Object.entries(stages).forEach(([id, stage]) => $(id)?.setAttribute('data-stage', stage));

  document.querySelectorAll('.unit-input em').forEach(unit => {
    if (unit.textContent.trim().toLowerCase() === 'px') unit.remove();
  });
  function percentField(input) {
    if (!input || input.parentElement.classList.contains('percent-input')) return;
    const wrap = document.createElement('span');
    wrap.className = 'percent-input';
    input.parentNode.insertBefore(wrap, input);
    wrap.append(input);
    const sign = document.createElement('span');
    sign.className = 'percent-sign';
    sign.textContent = '%';
    sign.setAttribute('aria-hidden', 'true');
    wrap.append(sign);
  }
  percentField($('rangeValue'));
  percentField($('alphaValue'));
  $('color')?.querySelector('.percent')?.remove();

  const slider = $('rangeSlider');
  const rangeLine = slider?.closest('.range-line');
  if (rangeLine) {
    const control = document.createElement('div');
    control.className = 'range-control';
    rangeLine.parentNode.insertBefore(control, rangeLine);
    control.append(rangeLine);
    const ends = document.createElement('div');
    ends.className = 'range-ends';
    ends.innerHTML = `<span>${slider.min || '0'}</span><span>${slider.max || '100'}</span>`;
    control.prepend(ends);
  }

  const dial = $('angleDial');
  if (dial) {
    const ring = document.createElement('span');
    ring.className = 'dial-ring';
    dial.parentNode.insertBefore(ring, dial);
    ring.append(dial);
    for (let n = 0; n < 8; n++) {
      const tick = document.createElement('i');
      tick.className = 'dial-tick';
      tick.style.setProperty('--tick-angle', `${n * 45}deg`);
      tick.setAttribute('aria-hidden', 'true');
      ring.append(tick);
    }
  }

  document.querySelectorAll('.specimen select').forEach(select => {
    const shell = document.createElement('span');
    shell.className = 'select-shell';
    select.parentNode.insertBefore(shell, select);
    shell.append(select);
    const arrow = document.createElement('span');
    arrow.className = 'select-arrow';
    arrow.textContent = '>';
    arrow.setAttribute('aria-hidden', 'true');
    shell.prepend(arrow);
    const open = () => { shell.classList.add('open'); arrow.textContent = '⌄'; };
    const close = () => { shell.classList.remove('open'); arrow.textContent = '>'; };
    select.addEventListener('pointerdown', open);
    select.addEventListener('keydown', event => { if (['Enter',' ','ArrowDown'].includes(event.key)) open(); });
    select.addEventListener('change', close);
    select.addEventListener('blur', close);
  });

  const switchRow = $('duotoneSwitch')?.closest('.toggle-row');
  if (switchRow) {
    const note = $('toggle')?.querySelector('.note');
    if (note) note.textContent = '打开后显示从属参数；浮标留下向下箭头，提示当前参数已展开。';
    const name = switchRow.querySelector('span');
    name.classList.add('toggle-name');
    switchRow.prepend($('duotoneSwitch'));
    $('duotoneSwitch').addEventListener('click', () => {
      switchRow.classList.toggle('enabled', $('duotoneSwitch').getAttribute('aria-checked') === 'true');
    });
  }

  const textField = $('textValue')?.closest('.field');
  textField?.classList.add('field-vertical');

  const preview = $('patternPreview');
  const patternTypeField = $('patternType')?.closest('.field');
  const patternColor = preview?.querySelector('.pattern-color');
  if (preview && patternTypeField && patternColor) {
    const controls = document.createElement('div');
    controls.className = 'pattern-controls';
    preview.after(controls);
    controls.append(patternTypeField);
    const colorField = document.createElement('div');
    colorField.className = 'field pattern-color-field';
    colorField.innerHTML = '<span>颜色</span>';
    colorField.append(patternColor);
    controls.append(colorField);
  }
})();
