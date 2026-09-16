const SpaceSound = (function () {
  let audio = null;
  let enabled = localStorage.getItem('spaceSoundEnabled') === 'true';
  let trackUrl = null;
  let loaded = false;
  let saveTimer = null;

  const POSITION_KEY = 'spaceSoundPosition';

  function savePosition() {
    if (audio && !isNaN(audio.currentTime)) {
      localStorage.setItem(POSITION_KEY, String(audio.currentTime));
    }
  }

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

      // Oldingi sahifada to'xtagan joydan davom ettirish
      const savedPos = parseFloat(localStorage.getItem(POSITION_KEY));
      const restorePosition = () => {
        if (!isNaN(savedPos) && savedPos > 0) {
          try { audio.currentTime = savedPos; } catch (e) { /* ignore */ }
        }
        audio.removeEventListener('loadedmetadata', restorePosition);
      };
      audio.addEventListener('loadedmetadata', restorePosition);

      // Pozitsiyani vaqti-vaqti bilan saqlab boramiz (har 3 soniyada)
      if (saveTimer) clearInterval(saveTimer);
      saveTimer = setInterval(savePosition, 3000);

      // Sahifadan chiqishdan oldin ham saqlaymiz
      window.addEventListener('pagehide', savePosition);
      window.addEventListener('beforeunload', savePosition);

      if (enabled) {
        audio.play().catch(() => {
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
    if (audio) {
      savePosition();
      audio.pause();
    }
  }

  function isEnabled() {
    return enabled;
  }

  ensureTrackLoaded();

  return { enable, disable, isEnabled };
})();

window.SpaceSound = SpaceSound;
