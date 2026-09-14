const SpaceSound = (function () {
  let ctx = null;
  let masterGain = null;
  let nodes = [];
  let enabled = localStorage.getItem('spaceSoundEnabled') === 'true';

  function buildAmbient() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.06;
    masterGain.connect(ctx.destination);

    // Chuqur kosmik "drone" - ikkita sekin modulyatsiyalangan oscillator
    [55, 82.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0.5;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      lfo.start();
      nodes.push(osc, lfo);
    });

    // Yumshoq "kosmik shamol" - filtrlangan oq shovqin
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.4;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    nodes.push(noise);
  }

  function enable() {
    enabled = true;
    localStorage.setItem('spaceSoundEnabled', 'true');
    buildAmbient();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function disable() {
    enabled = false;
    localStorage.setItem('spaceSoundEnabled', 'false');
    if (ctx) ctx.suspend();
  }

  function isEnabled() {
    return enabled;
  }

  // Sahifa yuklanganda, agar foydalanuvchi oldin yoqqan bo'lsa, avtomatik yoqishga urinamiz.
  // Brauzerlar foydalanuvchi interaktsiyasisiz ovoz chiqarishni bloklashi mumkin,
  // shuning uchun birinchi bosishda ham urinib ko'ramiz.
  if (enabled) {
    const tryResume = () => {
      enable();
      document.removeEventListener('click', tryResume);
      document.removeEventListener('touchstart', tryResume);
    };
    document.addEventListener('click', tryResume, { once: true });
    document.addEventListener('touchstart', tryResume, { once: true });
  }

  return { enable, disable, isEnabled };
})();

window.SpaceSound = SpaceSound;
