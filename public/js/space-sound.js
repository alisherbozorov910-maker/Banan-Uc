const SpaceSound = (function () {
  let audio = null;
  let enabled = localStorage.getItem('spaceSoundEnabled') === 'true';
  let trackUrl = null;
  let loaded = false;
  let saveTimer = null;
  let readyToPlay = false;

  const POSITION_KEY = 'spaceSoundPosition';

  function savePosition() {
    if (audio && !isNaN(audio.currentTime)) {
      localStorage.setItem(POSITION_KEY, String(audio.currentTime));
    }
  }

  function startPlaybackFromSavedPosition() {
    if (!audio) return;
    const savedPos = parseFloat(localStorage.getItem(POSITION_KEY));
    if (!isNaN(savedPos) && savedPos > 0 && isFinite(audio.duration) && savedPos < audio.duration) {
      try { audio.currentTime = savedPos; } catch (e) { /* ignore */ }
    }
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
      audio = new Audio();
      audio.loop = true;
      audio.volume = 0.35;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      // Pozitsiyani vaqti-vaqti bilan saqlab boramiz
      if (saveTimer) clearInterval(saveTimer);
      saveTimer = setInterval(savePosition, 3000);
      window.addEventListener('pagehide', savePosition);
      window.addEventListener('beforeunload', savePosition);

      audio.addEventListener('loadedmetadata', () => {
        readyToPlay = true;
        if (enabled) startPlaybackFromSavedPosition();
      }, { once: true });

      audio.src = trackUrl;
      audio.load();
    }
  }

  function enable() {
    enabled = true;
    localStorage.setItem('spaceSoundEnabled', 'true');
    ensureTrackLoaded().then(() => {
      if (audio && readyToPlay) startPlaybackFromSavedPosition();
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
