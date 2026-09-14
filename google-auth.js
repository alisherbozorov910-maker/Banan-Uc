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
    await api('/auth/google', { method: 'POST', body: { credential: response.credential } });
    window.location.href = '/';
  } catch (e) {
    alert(e.message || 'Google orqali kirishda xatolik yuz berdi');
  }
}
