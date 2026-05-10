const SPARKS_PER_SECOND = 40;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function calcRingSize() {
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(100, Math.min(260, minDim * 0.2));
}

let ctx = null;
let canvas = null;
let sparks = [];
let sparkColor = '#ffaa66';
let ringColor = '#ffffff';
let spawnAccumulator = 0;
let progress = 1;
let displayedProgress = 1;
let running = false;
let ringRadius = calcRingSize();
let ringWidth = ringRadius * 0.04;

// Refill animation state
let refillActive = false;
let refillStart = 0;
let refillTarget = 0;
let refillDuration = 0.8; // seconds
let refillElapsed = 0;

export function initRing(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resize();
}

export function resize() {
  if (!canvas) return;
  ringRadius = calcRingSize();
  ringWidth = ringRadius * 0.04;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

export function setRingProgress(p, r) {
  // Detect refill: progress jumps up (reset or mode switch)
  if (p - progress > 0.05) {
    refillActive = true;
    refillStart = displayedProgress;
    refillTarget = p;
    refillElapsed = 0;
  }
  progress = p;
  if (running && !r) {
    spawnAccumulator = 0;
  }
  running = r;
}

export function setSparkColor(color) {
  sparkColor = color;
}

export function setRingColor(color) {
  ringColor = color;
}

export function renderRing(dt) {
  if (!ctx) return;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  // Animate displayedProgress
  if (refillActive) {
    refillElapsed += dt;
    const t = Math.min(refillElapsed / refillDuration, 1);
    // ease-in-out cubic: slow → fast → slow
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    displayedProgress = refillStart + (refillTarget - refillStart) * eased;
    if (t >= 1) {
      refillActive = false;
    }
  } else {
    const lerpSpeed = 12;
    displayedProgress += (progress - displayedProgress) * (1 - Math.exp(-lerpSpeed * dt));
  }

  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + displayedProgress * Math.PI * 2;

  const scale = ringRadius / 160;
  const showSparks = (running || refillActive) && displayedProgress > 0 && displayedProgress < 0.999;
  if (showSparks) {
    const edgeX = cx + ringRadius * Math.cos(endAngle);
    const edgeY = cy + ringRadius * Math.sin(endAngle);
    const sprayDir = endAngle + Math.PI / 2;
    spawnAccumulator += SPARKS_PER_SECOND * dt;

    while (spawnAccumulator >= 1) {
      spawnAccumulator--;
      const spread = (Math.random() - 0.5) * 1.2;
      const speed = (0.3 + Math.random() * 1.5) * scale;
      sparks.push({
        x: edgeX + (Math.random() - 0.5) * ringWidth * 1.2,
        y: edgeY + (Math.random() - 0.5) * ringWidth * 1.2,
        vx: Math.cos(sprayDir + spread) * speed,
        vy: Math.sin(sprayDir + spread) * speed,
        life: 0.5 + Math.random() * 1.0,
        maxLife: 0.5 + Math.random() * 1.0,
        size: (0.8 + Math.random() * 2.5) * scale,
      });
    }
  }

  // Update & draw sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life -= dt;

    if (s.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }

    const alpha = s.life / s.maxLife;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(sparkColor, alpha * 0.8);
    ctx.fill();
  }

  if (sparks.length > 300) {
    sparks.splice(0, sparks.length - 300);
  }

  // Draw remaining arc
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, startAngle, endAngle, false);
  ctx.strokeStyle = hexToRgba(ringColor, 0.9);
  ctx.lineWidth = ringWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Subtle outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, startAngle, endAngle, false);
  ctx.strokeStyle = hexToRgba(ringColor, 0.12);
  ctx.lineWidth = ringWidth + ringWidth * 0.8;
  ctx.stroke();

  // Leading edge glow dot
  if (displayedProgress > 0 && displayedProgress < 1) {
    const dotR = ringWidth * 0.7;
    const glowR = ringWidth * 1.6;
    const ex = cx + ringRadius * Math.cos(endAngle);
    const ey = cy + ringRadius * Math.sin(endAngle);
    ctx.beginPath();
    ctx.arc(ex, ey, dotR, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(ringColor, 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(ringColor, 0.2);
    ctx.fill();
  }
}
