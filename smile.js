/* ============================================================
   See Your Smile — AI smile preview
   Uploads the photo to /api/smile (Gemini image editing) and shows
   the AI-redesigned teeth, with a قبل / بعد toggle to compare.
   ============================================================ */
(function () {
  const wrap     = document.getElementById('canvasWrap');
  const img      = document.getElementById('smileImg');
  const drop     = document.getElementById('smileDrop');
  const input    = document.getElementById('smileInput');
  const loading  = document.getElementById('smileLoading');
  const loadTxt  = document.getElementById('loadingText');
  const baTag    = document.getElementById('baTag');
  const baToggle = document.getElementById('baToggle');
  const styles   = document.getElementById('smileStyles');
  const genBtn   = document.getElementById('smileGenerate');
  const resetBtn = document.getElementById('smileReset');
  const dlBtn    = document.getElementById('smileDownload');
  const resultActions = document.getElementById('smileResultActions');
  if (!wrap || !img) return;

  // Endpoint. By default relative ('/api/smile') — works on Vercel / `npm start`.
  // When the site is hosted on GitHub Pages (which can't run the function),
  // set `window.SMILE_API_BASE = 'https://your-app.vercel.app'` in index.html
  // and the AI calls will go there instead. No other code changes needed.
  const API_BASE = (window.SMILE_API_BASE || '').replace(/\/$/, '');
  const API_URL = API_BASE + '/api/smile';
  const MAX_DIM = 1024;   // downscale the upload to keep the request small & fast

  let beforeUrl = null;   // original photo (data URL)
  let afterUrl  = null;   // AI result (data URL)
  let style     = 'bright';
  let busy      = false;

  /* ---- load + downscale the chosen image ---- */
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('فضلاً اختر ملف صورة صالح.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const im = new Image();
      im.onload = () => {
        let w = im.width, h = im.height;
        const scale = Math.min(MAX_DIM / w, MAX_DIM / h, 1);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        beforeUrl = c.toDataURL('image/jpeg', 0.92);
        afterUrl = null;
        showImage(beforeUrl);
        toReadyState();
      };
      im.onerror = () => alert('تعذّر تحميل الصورة، جرّب صورة أخرى.');
      im.src = reader.result;
    };
    reader.onerror = () => alert('تعذّر قراءة الملف، جرّب صورة أخرى.');
    reader.readAsDataURL(file);
  }

  function showImage(url) {
    img.src = url;
    img.style.display = 'block';
  }

  /* ---- UI states ---- */
  function toReadyState() {
    drop.classList.add('hide');
    baTag.style.display = 'none';
    baToggle.style.display = 'none';
    resultActions.style.display = 'none';
    resetBtn.style.display = 'block';
    genBtn.style.display = 'block';
    genBtn.disabled = false;
    genBtn.textContent = '✨ صمّم ابتسامتي';
  }

  function toResultState() {
    setLoading(false);
    baTag.style.display = 'block';
    baToggle.style.display = 'flex';
    setSide('after');
    genBtn.style.display = 'none';
    resultActions.style.display = 'flex';
    resetBtn.style.display = 'block';
  }

  function setLoading(on, msg) {
    busy = on;
    loading.style.display = on ? 'flex' : 'none';
    genBtn.disabled = on;
    if (on && msg) loadTxt.textContent = msg;
  }

  function resetAll() {
    if (busy) return;
    beforeUrl = afterUrl = null;
    img.removeAttribute('src');
    img.style.display = 'none';
    drop.classList.remove('hide');
    baTag.style.display = 'none';
    baToggle.style.display = 'none';
    resultActions.style.display = 'none';
    resetBtn.style.display = 'none';
    genBtn.style.display = 'block';
    genBtn.disabled = true;
    setLoading(false);
    input.value = '';
  }

  /* ---- before / after toggle ---- */
  function setSide(side) {
    if (side === 'before' && beforeUrl) {
      showImage(beforeUrl);
      baTag.textContent = 'قبل';
      baTag.classList.remove('after'); baTag.classList.add('before');
    } else if (afterUrl) {
      showImage(afterUrl);
      baTag.textContent = 'بعد ✨';
      baTag.classList.remove('before'); baTag.classList.add('after');
    }
    baToggle.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.show === side));
  }

  baToggle.querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => setSide(b.dataset.show)));

  /* ---- call the AI ---- */
  async function generate() {
    if (busy || !beforeUrl) return;
    setLoading(true, 'جارٍ تصميم ابتسامتك بالذكاء الاصطناعي…');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: beforeUrl, style }),
      });

      let payload = {};
      try { payload = await res.json(); } catch { /* non-JSON error */ }

      // No backend at this URL (e.g. static GitHub Pages with API base unset).
      if (res.status === 404) {
        throw new Error('خدمة الذكاء الاصطناعي غير مُفعّلة على هذا الرابط بعد. تواصل مع العيادة لتجربتها.');
      }
      if (!res.ok || !payload.image) {
        throw new Error(payload.error || 'تعذّر إنشاء النتيجة. حاول مرة أخرى.');
      }

      afterUrl = payload.image;
      toResultState();
    } catch (err) {
      setLoading(false);
      alert(err.message || 'حدث خطأ غير متوقع، حاول مرة أخرى.');
    }
  }
  genBtn.addEventListener('click', generate);

  /* ---- style chips ---- */
  styles.querySelectorAll('.style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (busy) return;
      styles.querySelectorAll('.style-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      style = chip.dataset.style;
      // If a result already exists, let the user re-generate with the new style.
      if (afterUrl) {
        afterUrl = null;
        showImage(beforeUrl);
        toReadyState();
        genBtn.textContent = '✨ أعد التصميم';
      }
    });
  });

  /* ---- file input + drag & drop ---- */
  input.addEventListener('change', e => loadFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  /* ---- download result ---- */
  dlBtn.addEventListener('click', () => {
    if (!afterUrl) return;
    const a = document.createElement('a');
    a.href = afterUrl;
    a.download = 'my-new-smile.png';
    a.click();
  });

  /* ---- reset ---- */
  resetBtn.addEventListener('click', resetAll);
})();
