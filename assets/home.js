(() => {
  const sections = [...document.querySelectorAll('.home-page main > section')];
  const navigation = document.querySelector('.chapter-nav');
  if (!sections.length || !navigation) return;
  const links = [...navigation.querySelectorAll('a')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null;
  function update() {
    frame = null;
    const height = innerHeight;
    let active = sections[0], mostVisible = -1;
    // Read geometry together, then update visual properties without changing layout.
    const positions = sections.map(section => ({section,rect:section.getBoundingClientRect()}));
    for (const {section,rect} of positions) {
      const visible = Math.max(0,Math.min(rect.bottom,height)-Math.max(rect.top,0));
      if (visible > mostVisible) {active=section;mostVisible=visible;}
      if (!section.querySelector('.chapter-panel')) continue;
      const offset = reduced.matches ? 0 : Math.max(-1,Math.min(1,rect.top>0?rect.top/height:rect.bottom<height?(rect.bottom-height)/height:0));
      section.style.setProperty('--chapter-offset',offset.toFixed(4));
      section.style.setProperty('--chapter-distance',Math.abs(offset).toFixed(4));
    }
    navigation.dataset.active = active.id;
    links.forEach(link => {
      if (link.hash === '#'+active.id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  function schedule() { if(frame===null) frame=requestAnimationFrame(update); }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',schedule);
  reduced.addEventListener('change',schedule);
  new ResizeObserver(schedule).observe(document.querySelector('.home-page main'));
  update();
})();
