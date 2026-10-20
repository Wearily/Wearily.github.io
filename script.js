/* ==========================================================================
   Portfolio interactions
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;

  /* ---------- Marquees: clone each set so the loop is seamless ---------- */
  function cloneSet(container, setSelector, copies) {
    const set = container.querySelector(setSelector);
    if (!set) return;

    for (let i = 0; i < copies; i++) {
      const clone = set.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
      container.appendChild(clone);
    }
  }

  document.querySelectorAll('[data-marquee]').forEach((track) => cloneSet(track, '.marquee__set', 2));
  document.querySelectorAll('[data-work-row]').forEach((row) => cloneSet(row, '.work__set', 2));

  /* ---------- Wordmarks that stretch to fill their container ---------- */
  const fitTargets = [...document.querySelectorAll('[data-fit-text]')];

  function fitText() {
    fitTargets.forEach((el) => {
      const word = el.firstElementChild;
      el.style.fontSize = '100px';
      const ratio = el.clientWidth / word.getBoundingClientRect().width;
      el.style.fontSize = `${100 * ratio}px`;
    });
  }

  fitText();
  if (document.fonts) document.fonts.ready.then(fitText);

  /* ---------- Page-load intro ---------- */
  // Wait two frames so the hidden start state is painted before it transitions
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

  /* ---------- Fade sections in as they scroll into view ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Scroll + mouse driven motion (one rAF loop) ---------- */
  const hero = document.querySelector('.hero');
  const heroSlider = document.querySelector('[data-hero-tilt]');
  const workSection = document.querySelector('[data-work]');
  const workRows = [...document.querySelectorAll('[data-work-row]')];
  const cursor = document.querySelector('.cursor');
  const cursorDot = document.querySelector('.cursor__dot');

  // Hero strip's starting pose; it eases to flat as the hero scrolls away
  const TILT = { x: -300, rotateX: 26, rotateY: 25, rotateZ: -32, skewX: 8, skewY: 11 };

  let workShift = 0; // how far (px) a work row travels across the whole section

  function measure() {
    const set = workRows[0] && workRows[0].querySelector('.work__set');
    workShift = set ? set.getBoundingClientRect().width * 0.5 : 0;
  }

  const current = { tilt: 1, work: 0, x: 0, y: 0 };
  const mouse = { x: 0, y: 0 };

  function readTargets() {
    const vh = window.innerHeight;
    const tilt = hero ? 1 - clamp(window.scrollY / (hero.offsetHeight * 0.6)) : 0;

    let work = 0;
    if (workSection) {
      const rect = workSection.getBoundingClientRect();
      work = clamp((vh - rect.top) / (vh + rect.height));
    }

    return { tilt, work };
  }

  function tick() {
    const target = readTargets();

    current.tilt = lerp(current.tilt, target.tilt, 0.08);
    current.work = lerp(current.work, target.work, 0.08);

    if (heroSlider) {
      const k = current.tilt;
      heroSlider.style.transform =
        `translate3d(${TILT.x * k}px, 0, 0) ` +
        `rotateX(${TILT.rotateX * k}deg) rotateY(${TILT.rotateY * k}deg) rotateZ(${TILT.rotateZ * k}deg) ` +
        `skew(${TILT.skewX * k}deg, ${TILT.skewY * k}deg)`;
    }

    workRows.forEach((row) => {
      const progress = row.dataset.workRow === 'left' ? current.work : 1 - current.work;
      row.style.transform = `translate3d(${-progress * workShift}px, 0, 0)`;
    });

    if (cursorDot && finePointer) {
      current.x = lerp(current.x, mouse.x, 0.15);
      current.y = lerp(current.y, mouse.y, 0.15);
      cursorDot.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
    }

    requestAnimationFrame(tick);
  }

  if (finePointer && cursor) {
    window.addEventListener('mousemove', (event) => {
      // Offsets from the centre of the screen, where the dot sits by default
      mouse.x = event.clientX - window.innerWidth / 2;
      mouse.y = event.clientY - window.innerHeight / 2;
      cursor.classList.add('is-active');
    }, { passive: true });

    document.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
  }

  measure();

  if (reduceMotion) {
    if (heroSlider) heroSlider.style.transform = 'none';
  } else {
    const start = readTargets();
    current.tilt = start.tilt;
    current.work = start.work;
    requestAnimationFrame(tick);
  }

  /* ---------- Accordions (services + FAQ): one item open at a time ---------- */
  let accordionId = 0;
  const openPanels = new Set();

  document.querySelectorAll('[data-accordion]').forEach((accordion) => {
    const items = [...accordion.querySelectorAll('.accordion__item')];

    function setOpen(item, open) {
      const toggle = item.querySelector('.accordion__toggle');
      const panel = item.querySelector('.accordion__panel');

      item.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      panel.style.height = open ? `${panel.scrollHeight}px` : '0px';

      if (open) openPanels.add(panel);
      else openPanels.delete(panel);
    }

    items.forEach((item) => {
      const toggle = item.querySelector('.accordion__toggle');
      const panel = item.querySelector('.accordion__panel');

      panel.id = `accordion-panel-${++accordionId}`;
      toggle.setAttribute('aria-controls', panel.id);

      toggle.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach((other) => { if (other !== item) setOpen(other, false); });
        setOpen(item, willOpen);
      });
    });
  });

  /* ---------- Reviews slider ---------- */
  const sliders = [];

  document.querySelectorAll('[data-slider]').forEach((slider) => {
    const viewport = slider.querySelector('.slider__viewport');
    const track = slider.querySelector('.slider__track');
    const slides = [...track.children];
    const dotsWrap = slider.querySelector('[data-slider-dots]');
    let index = 0;

    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slider__dot';
      dot.setAttribute('aria-label', `Show review ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.style.transform = `translate3d(${-index * (viewport.offsetWidth + gap)}px, 0, 0)`;
      dots.forEach((dot, n) => dot.classList.toggle('is-active', n === index));
    }

    slider.querySelector('[data-slider-prev]').addEventListener('click', () => goTo(index - 1));
    slider.querySelector('[data-slider-next]').addEventListener('click', () => goTo(index + 1));

    // Swipe / drag
    let startX = null;
    viewport.addEventListener('pointerdown', (event) => { startX = event.clientX; });
    window.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
    });
    window.addEventListener('pointercancel', () => { startX = null; });

    goTo(0);
    sliders.push(() => goTo(index));
  });

  /* ---------- Keep sizes right on resize ---------- */
  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      fitText();
      measure();
      sliders.forEach((refresh) => refresh());
      openPanels.forEach((panel) => { panel.style.height = `${panel.scrollHeight}px`; });
    });
  });

  /* ---------- Contact form ---------- */
  const form = document.querySelector('[data-contact-form]');

  if (form) {
    const success = document.querySelector('[data-form-success]');
    const error = document.querySelector('[data-form-error]');
    const submit = form.querySelector('[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;

      const endpoint = form.getAttribute('action');
      if (!endpoint) {
        error.textContent = 'This form is not connected yet. Add your form endpoint to the action attribute in index.html.';
        error.hidden = false;
        return;
      }

      submit.disabled = true;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(response.statusText);
        form.hidden = true;
        success.hidden = false;
      } catch {
        error.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
