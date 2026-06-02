/* ============================================================
   Security Lock — Access Control System
   PIN: 552487
   ============================================================ */
(function () {
  'use strict';

  const CORRECT_PIN = '552487';
  const MAX_ATTEMPTS = 5;
  let attempts = 0;
  let lockedUntil = null;

  // Check if locked out
  if (isLockedOut()) {
    showLockoutMessage();
  } else {
    // Always show security lock (no localStorage persistence)
    createSecurityLock();
  }

  function isLockedOut() {
    if (lockedUntil && Date.now() < lockedUntil) {
      return true;
    }
    // Clear expired lockout
    if (lockedUntil) {
      lockedUntil = null;
      attempts = 0;
    }
    return false;
  }

  function incrementAttempts() {
    attempts++;
    return attempts;
  }

  function resetAttempts() {
    attempts = 0;
  }

  function setLockout() {
    const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
    lockedUntil = Date.now() + LOCKOUT_DURATION;
  }

  function createSecurityLock() {
    const lockHTML = `
      <div id="securityLock">
        <div class="security-orb orb-1"></div>
        <div class="security-orb orb-2"></div>
        
        <div class="security-gate">
          <div class="security-icon">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15v2" stroke-linecap="round"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          
          <h2>يُرجى إدخال رمز الدخول</h2>
          <p>محتوى محمي — للوصول المصرح فقط</p>
          
          <div class="demo-notice">
            <svg viewBox="0 0 24 24" class="notice-icon">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="notice-content">
              <strong>⚠️ إشعار هام</strong>
              <p>هذا الموقع سوف يُحجب عن الإنترنت خلال 6 ساعات من تاريخ وتوقيت تقديم البروبوزال.</p>
              <p>جميع عمليات الحجز هي عمليات شكلية وليست واقعية — للتجربة فقط.</p>
            </div>
          </div>
          
          <div class="pin-location-notice">
            <strong>ستجد رمز الدخول (PIN) في الصفحة الخامسة من البروبوزال المقدم أسفل رمز الـ QR</strong>
          </div>
          
          <div class="pin-input-container">
            <label class="pin-input-label" for="pinInput">رمز الدخول (6 أرقام)</label>
            <input 
              type="tel" 
              id="pinInput" 
              maxlength="6" 
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder="••••••"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
            />
            <div class="error-message" id="errorMessage">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span id="errorText"></span>
            </div>
          </div>
          
          <button type="button" id="unlockButton">
            <span class="button-content">فتح الموقع</span>
            <span class="button-spinner"></span>
          </button>
          
          <div class="security-footer">
            <p>للحصول على رمز الدخول، يُرجى مراجعة المستند المرفق مع البروبوزال</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', lockHTML);
    document.body.style.overflow = 'hidden';
    document.body.classList.add('locked');

    // Get elements
    const lockScreen = document.getElementById('securityLock');
    const pinInput = document.getElementById('pinInput');
    const unlockButton = document.getElementById('unlockButton');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Focus input on load
    setTimeout(() => pinInput.focus(), 300);

    // Auto-focus on click
    lockScreen.addEventListener('click', (e) => {
      if (e.target === lockScreen || e.target.classList.contains('security-gate')) {
        pinInput.focus();
      }
    });

    // Only allow numbers
    pinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      
      // Clear error on input
      if (pinInput.classList.contains('error')) {
        pinInput.classList.remove('error');
        hideError();
      }

      // Auto-submit when 6 digits entered
      if (e.target.value.length === 6) {
        setTimeout(() => attemptUnlock(), 200);
      }
    });

    // Enter key submits
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && pinInput.value.length === 6) {
        attemptUnlock();
      }
    });

    // Button click
    unlockButton.addEventListener('click', attemptUnlock);

    function attemptUnlock() {
      const pin = pinInput.value.trim();

      if (pin.length !== 6) {
        showError('يُرجى إدخال 6 أرقام');
        shakeInput();
        return;
      }

      // Check if locked out
      if (isLockedOut()) {
        const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
        showError(`محاولات كثيرة خاطئة. حاول مرة أخرى بعد ${remainingMinutes} دقيقة`);
        shakeInput();
        return;
      }

      if (pin === CORRECT_PIN) {
        // Correct PIN
        unlockButton.classList.add('loading');
        hideError();

        setTimeout(() => {
          resetAttempts();
          unlockWebsite();
        }, 800);
      } else {
        // Wrong PIN
        const currentAttempts = incrementAttempts();
        const remaining = MAX_ATTEMPTS - currentAttempts;

        if (remaining <= 0) {
          setLockout();
          showError('محاولات كثيرة خاطئة. تم قفل الدخول لمدة 5 دقائق.');
          pinInput.disabled = true;
          unlockButton.disabled = true;
        } else {
          showError(`رمز خاطئ. تبقى لديك ${remaining} محاولة`);
        }

        shakeInput();
        pinInput.value = '';
        pinInput.focus();
      }
    }

    function unlockWebsite() {
      const lockScreen = document.getElementById('securityLock');

      // Reveal the cinematic intro beneath the gate and play it now, so the lock
      // dissolves straight into the loader instead of the loader being long gone.
      document.body.classList.remove('locked');
      document.dispatchEvent(new Event('site:unlock'));

      lockScreen.classList.add('unlocking');

      setTimeout(() => {
        lockScreen.remove();
        document.body.style.overflow = '';
      }, 800);
    }

    function showError(message) {
      errorText.textContent = message;
      errorMessage.classList.add('show');
    }

    function hideError() {
      errorMessage.classList.remove('show');
    }

    function shakeInput() {
      pinInput.classList.add('error');
      setTimeout(() => {
        pinInput.classList.remove('error');
      }, 500);
    }
  }

  function showLockoutMessage() {
    const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
    
    const lockHTML = `
      <div id="securityLock">
        <div class="security-orb orb-1"></div>
        <div class="security-orb orb-2"></div>
        
        <div class="security-gate">
          <div class="security-icon">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15v2" stroke-linecap="round"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          
          <h2>تم قفل الدخول مؤقتاً</h2>
          <p>محاولات خاطئة كثيرة.</p>
          <p style="margin-top: 20px; color: rgba(255, 120, 120, 0.95); font-weight: 600;">
            يُرجى المحاولة مرة أخرى بعد ${remainingMinutes} دقيقة
          </p>
          
          <div class="security-footer" style="margin-top: 32px;">
            <p>للحصول على المساعدة، يُرجى التواصل مع العيادة</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', lockHTML);
    document.body.style.overflow = 'hidden';
    document.body.classList.add('locked');

    // Check every 30 seconds if lockout has expired
    const checkInterval = setInterval(() => {
      if (!isLockedOut()) {
        clearInterval(checkInterval);
        location.reload();
      }
    }, 30000);
  }

  // Log instructions for developers
  console.log('%c🔐 عيادة الدكتورة سمية - قفل أمني نشط', 'font-size: 16px; font-weight: bold; color: #A9BCE0;');
  console.log('%cرمز الدخول (PIN): راجع الصفحة الخامسة من البروبوزال أسفل رمز الـ QR', 'font-size: 12px; color: #C9974A;');
})();
