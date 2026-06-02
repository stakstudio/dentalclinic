/* ============================================================
   Dr. Sumaya Dental Clinic — interactions
   ============================================================ */
(function () {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ====================================================
     CINEMATIC INTRO
     ==================================================== */
  const intro   = $('#intro');
  const curtain = $('#curtain');
  const skip    = $('#introSkip');
  const seen    = sessionStorage.getItem('sumaya_intro');

  function endIntro() {
    if (!intro || intro.classList.contains('gone')) return;
    curtain.classList.add('lift');
    intro.classList.add('gone');
    document.body.classList.remove('no-scroll');
    sessionStorage.setItem('sumaya_intro', '1');
    setTimeout(() => { intro.style.display = 'none'; curtain.style.display = 'none'; }, 1200);
    // kick off hero word reveals
    revealHero();
  }

  function startIntro() {
    if (seen || reduce) {
      // skip straight in
      if (intro) { intro.style.display = 'none'; intro.classList.add('gone'); }
      if (curtain) { curtain.style.display = 'none'; }
      document.body.classList.remove('no-scroll');
      revealHero();
    } else {
      document.body.classList.add('no-scroll');
      setTimeout(endIntro, 3600);
      skip.addEventListener('click', endIntro);
    }
  }

  // If the security gate is up, hold the intro until it's unlocked — otherwise the
  // loader plays hidden behind the lock and is already over by the time you unlock.
  if (document.getElementById('securityLock')) {
    document.addEventListener('site:unlock', startIntro, { once: true });
  } else {
    startIntro();
  }

  function revealHero() {
    // make hero r-elements visible immediately
    $$('.hero .r').forEach(el => el.classList.add('in'));
  }

  /* ====================================================
     NAV — solid on scroll, leaves hero
     ==================================================== */
  const nav = $('#nav');
  const hero = $('#top');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('solid', y > 40);
    const heroH = hero ? hero.offsetHeight - 90 : 600;
    nav.classList.toggle('on-hero', y < heroH);
    // progress
    const max = document.documentElement.scrollHeight - window.innerHeight;
    $('#prog').style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    // fab
    $('#fab').classList.toggle('show', y > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- smooth anchor scaffolding (native smooth handles it) ---------- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); closeMenu(); }
    });
  });

  /* ====================================================
     MOBILE MENU
     ==================================================== */
  const mmenu  = $('#mmenu');
  const burger = $('#burger');
  function openMenu()  {
    mmenu.classList.add('open');
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll', 'menu-open');
  }
  function closeMenu() {
    mmenu.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll', 'menu-open');
  }
  function toggleMenu() { mmenu.classList.contains('open') ? closeMenu() : openMenu(); }
  burger.addEventListener('click', toggleMenu);
  // tap the dark backdrop (outside the links) to close
  mmenu.addEventListener('click', (e) => { if (e.target === mmenu) closeMenu(); });
  // Escape closes; resizing up to desktop closes
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mmenu.classList.contains('open')) closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 860 && mmenu.classList.contains('open')) closeMenu(); });

  /* ====================================================
     SCROLL REVEALS
     ==================================================== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.r').forEach(el => { if (!el.closest('.hero')) io.observe(el); });

  /* ====================================================
     COUNT-UP STATS
     ==================================================== */
  const counted = new WeakSet();
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (counted.has(el)) return;
      counted.add(el);
      const target = +el.dataset.count;
      const suffix = el.querySelector('.plus') ? el.querySelector('.plus').outerHTML : '';
      const dur = 1600, t0 = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * eased);
        el.innerHTML = val.toLocaleString('en-US') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('.stat .num[data-count]').forEach(el => statIO.observe(el));

  /* ====================================================
     GALLERY — autoplay videos while in view, lightbox
     ==================================================== */
  const galVids = $$('.gal-item video');
  galVids.forEach(v => { v.muted = true; });
  const vidIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) { v.play().catch(() => {}); }
      else { v.pause(); }
    });
  }, { threshold: 0.25 });
  galVids.forEach(v => vidIO.observe(v));
  // also nudge on hover for instant feedback
  galVids.forEach(v => {
    const item = v.closest('.gal-item');
    item.addEventListener('mouseenter', () => v.play().catch(() => {}));
  });

  const lb = $('#lightbox');
  const lbVideo = $('#lbVideo');
  function openLB(src) {
    lbVideo.src = src; lb.style.display = 'grid'; lbVideo.play().catch(() => {});
    document.body.classList.add('no-scroll');
  }
  function closeLB() {
    lb.style.display = 'none'; lbVideo.pause(); lbVideo.removeAttribute('src'); lbVideo.load();
    document.body.classList.remove('no-scroll');
  }
  $$('.gal-item[data-video]').forEach(item => {
    item.addEventListener('click', () => openLB(item.dataset.video));
  });
  $('#watchBtn').addEventListener('click', () => openLB('assets/clinic2.mp4'));
  $('#lbClose').addEventListener('click', closeLB);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });

  /* ====================================================
     BOOKING FORM
     ==================================================== */
  const chips = $$('#svcChips .chip');
  let chosenSvc = 'كشف وتنظيف';
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.remove('active'));
    c.classList.add('active'); chosenSvc = c.textContent.trim();
  }));

  const form = $('#bookForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#bname').value.trim();
    const phone = $('#bphone').value.trim();
    if (!name) { $('#bname').focus(); shake($('#bname')); return; }
    if (!phone) { $('#bphone').focus(); shake($('#bphone')); return; }
    $('#okMsg').textContent = `شكرًا ${name}! سيتواصل معك فريق العيادة على الرقم ${phone} لتأكيد موعد «${chosenSvc}».`;
    form.style.display = 'none';
    $('#bookOk').classList.add('show');
  });
  $('#okAgain').addEventListener('click', () => {
    $('#bookOk').classList.remove('show');
    form.style.display = ''; form.reset();
    chips.forEach((x, i) => x.classList.toggle('active', i === 0));
    chosenSvc = 'كشف وتنظيف';
  });
  function shake(el) {
    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
      { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }], { duration: 300 });
    el.style.borderColor = '#d98a8a';
    setTimeout(() => el.style.borderColor = '', 1200);
  }

  /* ---------- hero video graceful fallback ----------
     If the video can't load, the <video> poster (inlined data-URI in the
     standalone build) stays visible — so we intentionally do NOT swap it out. */
})();
