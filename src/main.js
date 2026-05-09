import { initScene } from './scene.js';
import { createParticles, updateParticles, setParticleColor, getParticleColor, setParticleMode, setParticleSize, setParticleOpacity, setTrailLength, setParticlesVisible } from './particles.js';
import { createTimer } from './timer.js';
import { playFocusEndSound, playBreakEndSound } from './audio.js';
import { initRing, setRingProgress, setSparkColor, setRingColor, getRingColor, getSparkColor, renderRing, resize as resizeRing } from './ring.js';

// --- Constants ---
const FOCUS_COLOR = '#FF6B35';
const BREAK_COLOR = '#4CAF50';

// --- Theme ---
const THEME = {
  dark: {
    bg3d: 0x050505,
    particle: '#ffaa66',
    ring: '#ffffff',
    spark: '#ffaa66',
  },
  light: {
    bg3d: 0xf5f0e8,
    particle: '#e05520',
    ring: '#3d362b',
    spark: '#e05520',
  },
};

function getTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

// --- Per-theme custom color memory ---
const customColors = { dark: {}, light: {} };

(function loadCustomColors() {
  try {
    const saved = JSON.parse(localStorage.getItem('pomodoro-custom-colors'));
    if (saved) {
      if (saved.dark) customColors.dark = saved.dark;
      if (saved.light) customColors.light = saved.light;
    }
  } catch {}
})();

function saveCustomColors() {
  try { localStorage.setItem('pomodoro-custom-colors', JSON.stringify(customColors)); } catch {}
}

function getColorForTheme(theme, key, defaultVal) {
  return customColors[theme]?.[key] ?? defaultVal;
}

function setColorForTheme(theme, key, value) {
  if (!customColors[theme]) customColors[theme] = {};
  customColors[theme][key] = value;
  saveCustomColors();
}

function applyTheme(theme, prev) {
  document.documentElement.dataset.theme = theme;
  const t = THEME[theme];

  renderer.setClearColor(t.bg3d);

  const pColor = getColorForTheme(theme, 'particle', t.particle);
  setParticleColor(particlesData.particles, pColor);
  if (colorParticle) colorParticle.value = pColor;

  const rColor = getColorForTheme(theme, 'ring', t.ring);
  setRingColor(rColor);
  if (colorRing) colorRing.value = rColor;

  const sColor = getColorForTheme(theme, 'spark', t.spark);
  setSparkColor(sColor);
  if (colorSpark) colorSpark.value = sColor;

  const particlesVisible = customColors[theme]?.particlesVisible ?? false;
  setParticlesVisible(particlesVisible);
  if (toggleParticles) {
    toggleParticles.classList.toggle('active', particlesVisible);
  }

  try { localStorage.setItem('pomodoro-theme', theme); } catch {}
}

// --- Settings (mutable) ---
let focusMinutes = 25;
let breakMinutes = 5;
let cycleCount = 4;

// --- DOM elements ---
const canvas = document.getElementById('three-canvas');
const ringCanvas = document.getElementById('ring-canvas');
const timeDisplay = document.getElementById('time-display');
const modeLabel = document.getElementById('mode-label');
const btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const dotsContainer = document.getElementById('pomodoro-dots');

// --- Format helpers ---
function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTotalTime(totalMin) {
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

// --- Three.js setup ---
const { renderer, camera, scene } = initScene(canvas);
const particlesData = createParticles(scene);

// --- Ring setup ---
initRing(ringCanvas);

// --- State ---
let mode = 'focus';
let pomodoroCount = 0;
let completedCycles = 0;
let allFinished = false;

// --- Notification ---
function notify(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

function requestNotification() {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// --- Cycle display ---
function updateModeLabel() {
  const cycleInfo = ` · ${completedCycles}/${cycleCount}`;
  modeLabel.textContent = (mode === 'focus' ? '专注' : '休息') + cycleInfo;
}

function updateParticleMode() {
  setParticleMode(mode === 'focus' && timer.isRunning() ? 'orbit' : 'float');
}

// --- Mode switching ---
function switchMode(newMode) {
  mode = newMode;
  modeLabel.classList.remove('mode-focus', 'mode-break');
  timeDisplay.classList.remove('mode-focus', 'mode-break');
  if (mode === 'focus') {
    modeLabel.classList.add('mode-focus');
    timeDisplay.classList.add('mode-focus');
    timer.setDuration(focusMinutes);
  } else {
    modeLabel.classList.add('mode-break');
    timeDisplay.classList.add('mode-break');
    timer.setDuration(breakMinutes);
  }
  updateModeLabel();
  setRingProgress(1, false);
  iconPlay.style.display = 'none';
  iconPause.style.display = '';
  timer.start();
  updateParticleMode();
}

function addPomodoroDot() {
  const dot = document.createElement('span');
  dot.className = 'dot';
  dotsContainer.appendChild(dot);
}

// --- Timer ---
const timer = createTimer(
  (remainingSec, totalSec) => {
    timeDisplay.textContent = formatTime(remainingSec);
    setRingProgress(remainingSec / totalSec, timer.isRunning());
  },
  () => {
    if (mode === 'focus') {
      completedCycles++;
      pomodoroCount++;
      addPomodoroDot();
      updateModeLabel();
      playFocusEndSound();
      notify('番茄完成', '休息一下吧 🍅');
      switchMode('break');
    } else {
      playBreakEndSound();
      if (completedCycles >= cycleCount) {
        allFinished = true;
        notify('全部完成', `已完成 ${cycleCount} 个循环 🎉`);
        timer.reset();
        iconPlay.style.display = '';
        iconPause.style.display = 'none';
        setRingProgress(1, false);
        updateParticleMode();
        modeLabel.textContent = '完成';
        modeLabel.classList.remove('mode-focus', 'mode-break');
        modeLabel.classList.add('mode-focus');
      } else {
        notify('休息结束', '开始新的番茄');
        switchMode('focus');
      }
    }
  }
);

function resetToFocus() {
  allFinished = false;
  completedCycles = 0;
  mode = 'focus';
  modeLabel.classList.remove('mode-focus', 'mode-break');
  modeLabel.classList.add('mode-focus');
  timeDisplay.classList.remove('mode-focus', 'mode-break');
  timeDisplay.classList.add('mode-focus');
  timer.setDuration(focusMinutes);
  updateModeLabel();
}

// --- Button handlers ---
btnPlay.addEventListener('click', () => {
  requestNotification();
  if (timer.isRunning()) {
    timer.pause();
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
    setRingProgress(timer.getRemainingMs() / timer.getTotalMs(), false);
    updateParticleMode();
  } else {
    if (allFinished) {
      resetToFocus();
    }
    timer.start();
    iconPlay.style.display = 'none';
    iconPause.style.display = '';
    setRingProgress(timer.getRemainingMs() / timer.getTotalMs(), true);
    updateParticleMode();
  }
});

btnReset.addEventListener('click', () => {
  resetToFocus();
  timer.reset();
  iconPlay.style.display = '';
  iconPause.style.display = 'none';
  setRingProgress(1, false);
  updateParticleMode();
});

// --- Settings panel ---
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
const focusSlider = document.getElementById('focus-duration');
const breakSlider = document.getElementById('break-duration');
const cycleSlider = document.getElementById('cycle-count');
const focusVal = document.getElementById('focus-val');
const breakVal = document.getElementById('break-val');
const cycleVal = document.getElementById('cycle-val');
const totalTimeEl = document.getElementById('total-time');

function updateTotalTime() {
  const totalMin = cycleCount * (focusMinutes + breakMinutes);
  totalTimeEl.textContent = formatTotalTime(totalMin);
}

btnSettings.addEventListener('click', (e) => {
  e.stopPropagation();
  updateTotalTime();
  settingsPanel.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!settingsPanel.classList.contains('hidden') &&
      !settingsPanel.contains(e.target) &&
      e.target !== btnSettings) {
    settingsPanel.classList.add('hidden');
  }
});

focusSlider.addEventListener('input', () => {
  const val = parseInt(focusSlider.value);
  focusVal.textContent = val;
  focusMinutes = val;
  updateTotalTime();
  if (mode === 'focus' && !timer.isRunning()) {
    timer.setDuration(val);
    setRingProgress(1, false);
  }
});

breakSlider.addEventListener('input', () => {
  const val = parseInt(breakSlider.value);
  breakVal.textContent = val;
  breakMinutes = val;
  updateTotalTime();
  if (mode === 'break' && !timer.isRunning()) {
    timer.setDuration(val);
    setRingProgress(1, false);
  }
});

cycleSlider.addEventListener('input', () => {
  const val = parseInt(cycleSlider.value);
  cycleVal.textContent = val;
  cycleCount = val;
  updateTotalTime();
  updateModeLabel();
});

// --- Section toggles ---
function setupSectionToggle(toggleId, bodyId) {
  const toggle = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  toggle.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
  });
}

setupSectionToggle('section-time-toggle', 'section-time-body');
setupSectionToggle('section-custom-toggle', 'section-custom-body');

// --- About modal ---
const aboutBackdrop = document.getElementById('about-backdrop');
const aboutClose = document.getElementById('about-close');
const sectionAboutToggle = document.getElementById('section-about-toggle');
const aboutCard = document.getElementById('about-card');
const aboutParticleCanvas = document.getElementById('about-particle-canvas');
const aboutParticleCtx = aboutParticleCanvas.getContext('2d');
const aboutParticles = [];
let aboutParticleSpawnAcc = 0;
const ABOUT_PARTICLE_RATE = 120;

function initAboutParticleCanvas() {
  const dpr = window.devicePixelRatio || 1;
  aboutParticleCanvas.width = window.innerWidth * dpr;
  aboutParticleCanvas.height = window.innerHeight * dpr;
  aboutParticleCanvas.style.width = window.innerWidth + 'px';
  aboutParticleCanvas.style.height = window.innerHeight + 'px';
  aboutParticleCtx.setTransform(1, 0, 0, 1, 0, 0);
  aboutParticleCtx.scale(dpr, dpr);
}

function getAboutParticleColor(alpha) {
  const cs = getComputedStyle(document.documentElement);
  const hex = cs.getPropertyValue('--accent-focus').trim();
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function spawnAboutParticles(dt) {
  const rect = aboutCard.getBoundingClientRect();
  if (rect.width === 0) return;

  aboutParticleSpawnAcc += ABOUT_PARTICLE_RATE * dt;
  const origins = ['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br'];

  while (aboutParticleSpawnAcc >= 1) {
    aboutParticleSpawnAcc--;
    const origin = origins[Math.floor(Math.random() * 8)];
    let x, y, vx, vy;
    const angleRand = (Math.random() - 0.5) * 1.0;

    switch (origin) {
      case 'top':
        x = rect.left + Math.random() * rect.width;
        y = rect.top;
        vx = angleRand;
        vy = -(0.6 + Math.random() * 1.8);
        break;
      case 'bottom':
        x = rect.left + Math.random() * rect.width;
        y = rect.bottom;
        vx = angleRand;
        vy = 0.6 + Math.random() * 1.8;
        break;
      case 'left':
        x = rect.left;
        y = rect.top + Math.random() * rect.height;
        vx = -(0.6 + Math.random() * 1.8);
        vy = angleRand;
        break;
      case 'right':
        x = rect.right;
        y = rect.top + Math.random() * rect.height;
        vx = 0.6 + Math.random() * 1.8;
        vy = angleRand;
        break;
      case 'tl':
        x = rect.left + Math.random() * 24;
        y = rect.top + Math.random() * 24;
        vx = -(0.4 + Math.random() * 1.4);
        vy = -(0.4 + Math.random() * 1.4);
        break;
      case 'tr':
        x = rect.right - Math.random() * 24;
        y = rect.top + Math.random() * 24;
        vx = 0.4 + Math.random() * 1.4;
        vy = -(0.4 + Math.random() * 1.4);
        break;
      case 'bl':
        x = rect.left + Math.random() * 24;
        y = rect.bottom - Math.random() * 24;
        vx = -(0.4 + Math.random() * 1.4);
        vy = 0.4 + Math.random() * 1.4;
        break;
      case 'br':
        x = rect.right - Math.random() * 24;
        y = rect.bottom - Math.random() * 24;
        vx = 0.4 + Math.random() * 1.4;
        vy = 0.4 + Math.random() * 1.4;
        break;
    }

    aboutParticles.push({
      x, y, vx, vy,
      life: 0.8 + Math.random() * 1.6,
      maxLife: 0.8 + Math.random() * 1.6,
      size: 1.5 + Math.random() * 4.0,
    });
  }
}

function updateAboutParticles(dt) {
  for (let i = aboutParticles.length - 1; i >= 0; i--) {
    const p = aboutParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    if (p.life <= 0) {
      aboutParticles.splice(i, 1);
    }
  }
  if (aboutParticles.length > 350) {
    aboutParticles.splice(0, aboutParticles.length - 350);
  }
}

function renderAboutParticles() {
  const ctx = aboutParticleCtx;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const p of aboutParticles) {
    const alpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = getAboutParticleColor(alpha * 0.85);
    ctx.fill();
  }
}

function openAbout() {
  aboutParticles.length = 0;
  aboutParticleSpawnAcc = 0;
  initAboutParticleCanvas();
  aboutBackdrop.classList.add('open');
}

function closeAbout() {
  aboutBackdrop.classList.remove('open');
}

sectionAboutToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  openAbout();
});

aboutClose.addEventListener('click', () => {
  closeAbout();
});

aboutBackdrop.addEventListener('click', (e) => {
  if (e.target === aboutBackdrop) {
    closeAbout();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aboutBackdrop.classList.contains('open')) {
    closeAbout();
  }
});

// --- Color pickers ---
const colorParticle = document.getElementById('color-particle');
const colorRing = document.getElementById('color-ring');
const colorSpark = document.getElementById('color-spark');
const toggleParticles = document.getElementById('toggle-particles');

colorParticle.addEventListener('input', () => {
  setParticleColor(particlesData.particles, colorParticle.value);
  setColorForTheme(getTheme(), 'particle', colorParticle.value);
});

colorRing.addEventListener('input', () => {
  setRingColor(colorRing.value);
  setColorForTheme(getTheme(), 'ring', colorRing.value);
});

colorSpark.addEventListener('input', () => {
  setSparkColor(colorSpark.value);
  setColorForTheme(getTheme(), 'spark', colorSpark.value);
});

toggleParticles.addEventListener('click', () => {
  const visible = !toggleParticles.classList.contains('active');
  toggleParticles.classList.toggle('active', visible);
  setParticlesVisible(visible);
  setColorForTheme(getTheme(), 'particlesVisible', visible);
});

// --- Particle sliders ---
const particleSizeSlider = document.getElementById('particle-size');
const particleSizeVal = document.getElementById('particle-size-val');
const particleOpacitySlider = document.getElementById('particle-opacity');
const particleOpacityVal = document.getElementById('particle-opacity-val');
const trailLengthSlider = document.getElementById('trail-length');
const trailLengthVal = document.getElementById('trail-length-val');

particleSizeSlider.addEventListener('input', () => {
  const val = parseFloat(particleSizeSlider.value);
  particleSizeVal.textContent = val.toFixed(3);
  setParticleSize(val);
});

particleOpacitySlider.addEventListener('input', () => {
  const val = parseFloat(particleOpacitySlider.value);
  particleOpacityVal.textContent = val.toFixed(2);
  setParticleOpacity(val);
});

trailLengthSlider.addEventListener('input', () => {
  const val = parseFloat(trailLengthSlider.value);
  trailLengthVal.textContent = val.toFixed(1);
  setTrailLength(val);
});

// --- Fullscreen toggle ---
const btnFullscreen = document.getElementById('btn-fullscreen');

btnFullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

document.addEventListener('fullscreenchange', () => {
  btnFullscreen.classList.toggle('is-fullscreen', !!document.fullscreenElement);
});

// --- Theme toggle ---
const btnTheme = document.getElementById('btn-theme');
const themeRipple = document.getElementById('theme-ripple');

btnTheme.addEventListener('click', () => {
  const prev = getTheme();
  const next = prev === 'dark' ? 'light' : 'dark';
  const t = THEME[next];

  const rect = btnTheme.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxDim = Math.max(window.innerWidth, window.innerHeight);
  const size = maxDim * 3;

  themeRipple.style.background = next === 'dark' ? '#050505' : '#f5f0e8';
  themeRipple.style.width = size + 'px';
  themeRipple.style.height = size + 'px';
  themeRipple.style.left = (cx - size / 2) + 'px';
  themeRipple.style.top = (cy - size / 2) + 'px';
  themeRipple.style.transition = 'none';
  themeRipple.style.transform = 'scale(0)';
  themeRipple.offsetHeight; // force reflow
  themeRipple.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
  themeRipple.style.transform = 'scale(1)';

  function onEnd() {
    themeRipple.removeEventListener('transitionend', onEnd);
    applyTheme(next, prev);

    // Ring "emerge from water" effect: snap to blurry, then transition to sharp
    ringCanvas.style.transition = 'none';
    ringCanvas.style.filter = 'blur(6px)';
    ringCanvas.style.opacity = '0.5';
    ringCanvas.offsetHeight; // force reflow — commit blurry state
    ringCanvas.style.transition = 'filter 0.8s cubic-bezier(0.25, 0, 0.25, 1), opacity 0.6s ease-out';
    ringCanvas.style.filter = 'blur(0px)';
    ringCanvas.style.opacity = '1';

    themeRipple.style.transition = 'none';
    themeRipple.style.transform = 'scale(0)';
  }
  themeRipple.addEventListener('transitionend', onEnd);
});

// --- Init ---
(function init() {
  const saved = (() => { try { return localStorage.getItem('pomodoro-theme'); } catch { return null; } })();
  applyTheme(saved || 'dark');

  modeLabel.classList.add('mode-focus');
  timeDisplay.classList.add('mode-focus');
  updateModeLabel();
})();

// --- Animation loop ---
let lastTime = performance.now();

function animate() {
  const now = performance.now();
  const deltaTime = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  requestAnimationFrame(animate);

  timer.tick();
  updateParticles(particlesData, deltaTime);
  renderRing(deltaTime);

  if (aboutBackdrop.classList.contains('open')) {
    spawnAboutParticles(deltaTime);
    updateAboutParticles(deltaTime);
    renderAboutParticles();
  }

  renderer.render(scene, camera);
}

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeRing();
  if (aboutBackdrop.classList.contains('open')) {
    initAboutParticleCanvas();
  }
});

animate();
