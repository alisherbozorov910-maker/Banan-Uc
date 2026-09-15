const SpaceSound = (function () {
  let audio = null;
  let enabled = localStorage.getItem('spaceSoundEnabled') === 'true';
  let trackUrl = null;
  let loaded = false;

  async function ensureTrackLoaded() {
    if (loaded) return;
    loaded = true;
    try {
      const res = await fetch('/api/settings/music');
      const data = await res.json();
      trackUrl = data.url || null;
    } catch (e) {
      trackUrl = null;
    }

    if (trackUrl) {
      audio = new Audio(trackUrl);
      audio.loop = true;
      audio.volume = 0.35;
      audio.preload = 'auto';
      if (enabled) {
        audio.play().catch(() => {
          // Brauzer avtomatik ijro etishni bloklagan bo'lishi mumkin,
          // birinchi foydalanuvchi bosishida qayta urinamiz.
          const tryPlay = () => {
            audio.play().catch(() => {});
            document.removeEventListener('click', tryPlay);
            document.removeEventListener('touchstart', tryPlay);
          };
          document.addEventListener('click', tryPlay, { once: true });
          document.addEventListener('touchstart', tryPlay, { once: true });
        });
      }
    }
  }

  function enable() {
    enabled = true;
    localStorage.setItem('spaceSoundEnabled', 'true');
    ensureTrackLoaded().then(() => {
      if (audio) audio.play().catch(() => {});
    });
  }

  function disable() {
    enabled = false;
    localStorage.setItem('spaceSoundEnabled', 'false');
    if (audio) audio.pause();
  }

  function isEnabled() {
    return enabled;
  }

  // Sahifa yuklanganda trekni oldindan tayyorlab qo'yamiz (hali ijro etilmaydi,
  // faqat foydalanuvchi yoqqan bo'lsa avtomatik urinib ko'ramiz).
  ensureTrackLoaded();

  return { enable, disable, isEnabled };
})();

window.SpaceSound = SpaceSound;
