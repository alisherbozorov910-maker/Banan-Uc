(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'space-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W, H;
  let stars = [];
  let shootingStars = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    const count = Math.floor((W * H) / 3500);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.03,
        driftY: (Math.random() - 0.5) * 0.03,
        hue: Math.random() > 0.85 ? 262 : (Math.random() > 0.5 ? 45 : 200)
      });
    }
  }

  function maybeSpawnShootingStar() {
    if (Math.random() < 0.006 && shootingStars.length < 3) {
      const startX = Math.random() * W * 0.8;
      const startY = Math.random() * H * 0.3;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      const speed = Math.random() * 6 + 8;
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 30 + 40
      });
    }
  }

  function drawNebula(time) {
    const g1 = ctx.createRadialGradient(W * 0.2, H * 0.25, 0, W * 0.2, H * 0.25, W * 0.55);
    g1.addColorStop(0, 'rgba(124,58,237,0.16)');
    g1.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(
      W * 0.8 + Math.sin(time * 0.0002) * 40, H * 0.7, 0,
      W * 0.8, H * 0.7, W * 0.5
    );
    g2.addColorStop(0, 'rgba(34,211,238,0.10)');
    g2.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }

  function draw(time) {
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, W, H);

    drawNebula(time);

    for (const s of stars) {
      s.twinklePhase += s.twinkleSpeed;
      const alpha = s.baseAlpha + Math.sin(s.twinklePhase) * 0.3;
      s.x += s.driftX;
      s.y += s.driftY;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;

      ctx.beginPath();
      ctx.fillStyle = `hsla(${s.hue}, 90%, 80%, ${Math.max(0, Math.min(1, alpha))})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    maybeSpawnShootingStar();
    shootingStars = shootingStars.filter(sh => sh.life < sh.maxLife);
    for (const sh of shootingStars) {
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life++;
      const alpha = 1 - sh.life / sh.maxLife;
      const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 6, sh.y - sh.vy * 6);
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * 6, sh.y - sh.vy * 6);
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();
