(function () {
  const HASH = '55305d900ad973652d5f4a3e9ba95844f4851bc79b0d1c18b71baccb72c760f2';
  const KEY  = 'gd-auth';

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function buildOverlay() {
    const el = document.createElement('div');
    el.id = 'auth-overlay';
    el.innerHTML = `
      <div id="auth-box">
        <div id="auth-title">🌹 Grateful Dead Lyrics</div>
        <div id="auth-subtitle">Enter the password to continue</div>
        <input id="auth-input" type="password" placeholder="Password" autocomplete="current-password" />
        <button id="auth-btn">Enter</button>
        <div id="auth-error"></div>
      </div>
    `;
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: #1a0d03;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Quicksand', sans-serif;
    `;
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        #auth-box {
          text-align: center;
          padding: 48px 40px;
          background: rgba(40, 20, 5, 0.85);
          border: 1px solid rgba(210, 170, 100, 0.35);
          border-radius: 16px;
          max-width: 360px;
          width: 90%;
        }
        #auth-title {
          font-family: 'Cinzel Decorative', serif;
          font-size: 1.2rem;
          color: #f0dfa0;
          margin-bottom: 8px;
        }
        #auth-subtitle {
          font-size: 0.85rem;
          color: rgba(240, 210, 150, 0.6);
          margin-bottom: 24px;
        }
        #auth-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(210, 170, 100, 0.35);
          background: rgba(255,255,255,0.05);
          color: #f0dfa0;
          font-family: 'Quicksand', sans-serif;
          font-size: 1rem;
          margin-bottom: 12px;
          box-sizing: border-box;
          text-align: center;
        }
        #auth-input:focus { outline: none; border-color: rgba(210, 170, 100, 0.75); }
        #auth-btn {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(210, 170, 100, 0.5);
          background: rgba(80, 40, 10, 0.7);
          color: #f0dfa0;
          font-family: 'Quicksand', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        #auth-btn:hover { background: rgba(120, 60, 15, 0.8); border-color: rgba(210, 170, 100, 0.8); }
        #auth-error {
          margin-top: 12px;
          font-size: 0.8rem;
          color: #e07070;
          min-height: 1em;
        }
      </style>
    `);
    return el;
  }

  async function check() {
    if (localStorage.getItem(KEY) === HASH) return;

    document.documentElement.style.visibility = 'hidden';
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.visibility = '';
      const overlay = buildOverlay();
      document.body.appendChild(overlay);
      const input = document.getElementById('auth-input');
      const btn   = document.getElementById('auth-btn');
      const error = document.getElementById('auth-error');

      async function attempt() {
        const hash = await sha256(input.value);
        if (hash === HASH) {
          localStorage.setItem(KEY, HASH);
          overlay.remove();
        } else {
          error.textContent = 'Incorrect password. Try again.';
          input.value = '';
          input.focus();
        }
      }

      btn.addEventListener('click', attempt);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
      input.focus();
    });
  }

  check();
})();
