(() => {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const scroll = $('scroll'), sheet = $('sheet'), tail = $('tail');
  const rollT = $('rollTop'), rollB = $('rollBot'), seal = $('seal'), hint = $('hint');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TOP_OPEN = 28;   // gap above scroll once opened
  const LEAD = 0.86;     // unrolling edge sits at 86% of viewport height
  const S = { p: 0 };    // opening progress 0..1
  let H = 0, vh = innerHeight, ROD = 24, ROLL_CLOSED = 64, ROLL_OPEN = 14;
  let opened = false, idle;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const cssPx = (n) => parseFloat(getComputedStyle(root).getPropertyValue(n));

  function measure() {
    H = sheet.offsetHeight;          // natural content height, unaffected by clipping
    vh = innerHeight;
    ROD = cssPx('--rod'); ROLL_CLOSED = cssPx('--roll-closed'); ROLL_OPEN = cssPx('--roll-open');
  }

  function render() {
    const p = S.p;
    const rollH = lerp(ROLL_CLOSED, ROLL_OPEN, p);
    const top = lerp(Math.max(16, (vh - (ROD * 2 + ROLL_CLOSED)) / 2), TOP_OPEN, p);
    const headH = ROD + rollH;
    // visible parchment length = how far the viewport's reading line is below the sheet's top, capped by content height
    const edge = clamp(scrollY + vh * LEAD - (top + headH), 0, H) * p;

    scroll.style.marginTop = top.toFixed(1) + 'px';
    rollT.style.height = rollH.toFixed(1) + 'px';
    sheet.style.clipPath = `inset(0 0 ${Math.max(0, H - edge).toFixed(1)}px 0)`;
    rollB.style.height = (ROLL_OPEN * p).toFixed(1) + 'px';
    rollB.style.opacity = p;
    tail.style.transform = `translate3d(0,${(headH + edge).toFixed(1)}px,0)`;
  }

  function refresh() { measure(); render(); }

  function reveal() {
    ScrollTrigger.batch('.reveal', {
      start: 'top 84%',
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power2.out', overwrite: true })
    });
  }

  function open() {
    if (opened) return;
    opened = true;
    scroll.removeAttribute('role'); scroll.removeAttribute('tabindex'); scroll.style.cursor = 'default';
    idle && idle.kill();
    const d = reduce ? 0.01 : 1;
    gsap.timeline()
      .to(seal, { scale: 1.4, opacity: 0, rotate: 25, duration: 0.5 * d, ease: 'power2.in' }, 0)
      .to(hint, { opacity: 0, duration: 0.3 * d }, 0)
      .to(scroll, { y: 0, duration: 0.3 * d }, 0)
      .to(S, { p: 1, duration: 2.4 * d, ease: 'power3.inOut', onUpdate: render }, 0.3 * d)
      .add(reveal, 1.3 * d)
      .add(() => {
        gsap.set(scroll, { clearProps: 'transform' });
        root.classList.remove('locked');
        ScrollTrigger.refresh();
        render();
      });
  }

  // init
  measure();
  gsap.set('.reveal', { opacity: 0, y: 12 });
  render();
  if (!reduce) {
    idle = gsap.to(scroll, { y: -5, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(seal, { scale: 1.07, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: render, onRefresh: refresh });

  scroll.addEventListener('click', open);
  scroll.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  // react to viewport changes and to any change in content height (fonts, images, added text)
  addEventListener('resize', refresh);
  let t;
  new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => { refresh(); ScrollTrigger.refresh(); }, 60);
  }).observe(sheet);
  document.fonts && document.fonts.ready.then(refresh);
})();
