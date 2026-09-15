async function initGoogleSignIn(containerId) {
  try {
    const { googleClientId } = await api('/auth/config');
    if (!googleClientId) {
      document.getElementById(containerId).innerHTML =
        '<p class="text-dim" style="font-size:12px;">Google orqali kirish hozircha sozlanmagan</p>';
      return;
    }

    function waitForGoogle(retries) {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential
        });
        window.google.accounts.id.renderButton(
          document.getElementById(containerId),
          { theme: 'filled_black', size: 'large', width: 320, text: 'continue_with' }
        );
      } else if (retries > 0) {
        setTimeout(() => waitForGoogle(retries - 1), 200);
      }
    }
    waitForGoogle(25);
  } catch (e) {
    console.error('Google Sign-In init xatosi:', e);
  }
}

async function handleGoogleCredential(response) {
  try {
    const data = await api('/auth/google', { method: 'POST', body: { credential: response.credential } });
    if (data.needsUsername) {
      showUsernameModal(data.googleToken, data.suggestedUsername || '');
      return;
    }
    window.location.href = '/';
  } catch (e) {
    alert(e.message || 'Google orqali kirishda xatolik yuz berdi');
  }
}

function showUsernameModal(googleToken, suggested) {
  const existing = document.getElementById('google-username-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'google-username-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;';

  overlay.innerHTML = `
    <div class="card form-card">
      <h2>Username tanlang</h2>
      <p class="text-dim" style="font-size:13px;">Google hisobingiz tasdiqlandi. Endi saytda ko'rinadigan username kiriting.</p>
      <div id="gu-error" class="alert alert-error hidden"></div>
      <div class="field">
        <label>Username</label>
        <input type="text" id="gu-username" value="${suggested.replace(/"/g, '')}">
      </div>
      <button class="btn btn-primary btn-block" id="gu-confirm-btn">Davom etish</button>
      <button class="btn btn-ghost btn-block mt-2" id="gu-cancel-btn">Bekor qilish</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('gu-cancel-btn').addEventListener('click', () => overlay.remove());

  document.getElementById('gu-confirm-btn').addEventListener('click', async () => {
    const username = document.getElementById('gu-username').value.trim();
    const errBox = document.getElementById('gu-error');
    errBox.classList.add('hidden');
    if (!username) {
      errBox.textContent = 'Username kiriting';
      errBox.classList.remove('hidden');
      return;
    }
    try {
      await api('/auth/google-complete', { method: 'POST', body: { googleToken, username } });
      window.location.href = '/';
    } catch (e) {
      errBox.textContent = e.message;
      errBox.classList.remove('hidden');
    }
  });
}
