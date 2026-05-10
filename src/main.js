import { createLogger } from './logger.js';
import { initScene } from './scene.js';
import { createParticles, updateParticles, setParticleColor, setParticleMode, setParticleSize, setParticleOpacity, setTrailLength, setParticlesVisible } from './particles.js';
import { createTimer } from './timer.js';
import { playFocusEndSound, playBreakEndSound } from './audio.js';
import { initRing, setRingProgress, setSparkColor, setRingColor, renderRing, resize as resizeRing } from './ring.js';
import { isTauri, closeWindow, minimizeWindow, toggleAlwaysOnTop, setFullscreen, isFullscreen, sendNotification, requestNotificationPermission, updateTrayStatus, listenTrayEvent, isAutostartEnabled, setAutostart, checkUpdate } from './tauri-api.js';

const log = createLogger('main');

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
      log.info('自定义颜色已加载');
    }
  } catch (err) {
    log.error('加载自定义颜色失败', err);
  }
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

function applyTheme(theme) {
  log.info('应用主题', { theme });
  document.documentElement.dataset.theme = theme;
  const t = THEME[theme];

  renderer.setClearColor(t.bg3d);

  const pColor = getColorForTheme(theme, 'particle', t.particle);
  setParticleColor(pColor);
  if (colorParticle) colorParticle.value = pColor;

  const rColor = getColorForTheme(theme, 'ring', t.ring);
  setRingColor(rColor);
  if (colorRing) colorRing.value = rColor;

  const sColor = getColorForTheme(theme, 'spark', t.spark);
  setSparkColor(sColor);
  if (colorSpark) colorSpark.value = sColor;

  const particlesVisible = getColorForTheme(theme, 'particlesVisible', false);
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
createParticles(scene);

// --- Ring setup ---
initRing(ringCanvas);

// --- State ---
let mode = 'focus';
let pomodoroCount = 0;
let completedCycles = 0;
let allFinished = false;

// --- Notification ---
function notify(title, body) {
  sendNotification(title, body);
}

async function requestNotification() {
  await requestNotificationPermission();
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
  log.info('切换模式', { from: mode, to: newMode });
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
    pushTrayStatus();
  },
  () => {
    log.info('计时结束', { mode, completedPomodoros: pomodoroCount, completedCycles });
    if (mode === 'focus') {
      completedCycles++;
      pomodoroCount++;
      addPomodoroDot();
      updateModeLabel();
      playFocusEndSound();
      notify('番茄完成', '休息一下吧 🍅');
      log.info('番茄完成，切换到休息模式', { pomodoroCount, completedCycles });
      switchMode('break');
    } else {
      playBreakEndSound();
      if (completedCycles >= cycleCount) {
        allFinished = true;
        log.info('全部循环完成', { totalCycles: cycleCount, completedPomodoros: pomodoroCount });
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
        log.info('休息结束，切换到专注模式');
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
    log.info('暂停计时器');
    timer.pause();
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
    setRingProgress(timer.getRemainingMs() / timer.getTotalMs(), false);
    updateParticleMode();
    pushTrayStatus();
  } else {
    if (allFinished) {
      log.info('重新开始（从完成状态）');
      resetToFocus();
    }
    log.info('开始计时器', { mode, remainingMs: timer.getRemainingMs() });
    timer.start();
    iconPlay.style.display = 'none';
    iconPause.style.display = '';
    setRingProgress(timer.getRemainingMs() / timer.getTotalMs(), true);
    updateParticleMode();
    pushTrayStatus();
  }
});

btnReset.addEventListener('click', () => {
  log.info('重置计时器');
  resetToFocus();
  timer.reset();
  iconPlay.style.display = '';
  iconPause.style.display = 'none';
  setRingProgress(1, false);
  updateParticleMode();
  pushTrayStatus();
});

// --- Settings modal ---
const btnSettings = document.getElementById('btn-settings');
const settingsBackdrop = document.getElementById('settings-backdrop');
const settingsClose = document.getElementById('settings-close');
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

function openSettings() {
  log.info('打开设置面板');
  updateTotalTime();
  settingsBackdrop.classList.add('open');
}

function closeSettings() {
  log.info('关闭设置面板');
  settingsBackdrop.classList.remove('open');
}

btnSettings.addEventListener('click', (e) => {
  e.stopPropagation();
  openSettings();
});

settingsClose.addEventListener('click', () => {
  closeSettings();
});

settingsBackdrop.addEventListener('click', (e) => {
  if (e.target === settingsBackdrop) {
    closeSettings();
  }
});

// --- Section collapse/expand ---
document.querySelectorAll('.section-header').forEach(header => {
  header.addEventListener('click', () => {
    const body = header.nextElementSibling;
    if (!body || !body.classList.contains('section-body')) return; // about section has no body
    const collapsed = body.classList.toggle('collapsed');
    header.classList.toggle('collapsed', collapsed);
    log.info(collapsed ? '收起面板' : '展开面板', { section: header.querySelector('.scs-title')?.textContent });
  });
});

focusSlider.addEventListener('input', () => {
  const val = parseInt(focusSlider.value);
  log.info('专注时长调整', { minutes: val });
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
  log.info('休息时长调整', { minutes: val });
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
  log.info('循环次数调整', { cycles: val });
  cycleVal.textContent = val;
  cycleCount = val;
  updateTotalTime();
  updateModeLabel();
});

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
  log.info('打开关于面板');
  closeSettings();
  aboutParticles.length = 0;
  aboutParticleSpawnAcc = 0;
  initAboutParticleCanvas();
  aboutBackdrop.classList.add('open');
}

function closeAbout() {
  log.info('关闭关于面板');
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
  if (e.key === 'Escape') {
    if (settingsBackdrop.classList.contains('open')) {
      closeSettings();
    }
    if (aboutBackdrop.classList.contains('open')) {
      closeAbout();
    }
  }
});

// --- Color pickers ---
const colorParticle = document.getElementById('color-particle');
const colorRing = document.getElementById('color-ring');
const colorSpark = document.getElementById('color-spark');
const toggleParticles = document.getElementById('toggle-particles');

colorParticle.addEventListener('input', () => {
  log.info('粒子颜色变更', { color: colorParticle.value });
  setParticleColor(colorParticle.value);
  setColorForTheme(getTheme(), 'particle', colorParticle.value);
});

colorRing.addEventListener('input', () => {
  log.info('光环颜色变更', { color: colorRing.value });
  setRingColor(colorRing.value);
  setColorForTheme(getTheme(), 'ring', colorRing.value);
});

colorSpark.addEventListener('input', () => {
  log.info('端点粒子颜色变更', { color: colorSpark.value });
  setSparkColor(colorSpark.value);
  setColorForTheme(getTheme(), 'spark', colorSpark.value);
});

toggleParticles.addEventListener('click', () => {
  const visible = !toggleParticles.classList.contains('active');
  log.info('粒子特效开关', { visible });
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
  log.info('粒子大小调整', { size: val });
  particleSizeVal.textContent = val.toFixed(3);
  setParticleSize(val);
});

particleOpacitySlider.addEventListener('input', () => {
  const val = parseFloat(particleOpacitySlider.value);
  log.info('粒子透明度调整', { opacity: val });
  particleOpacityVal.textContent = val.toFixed(2);
  setParticleOpacity(val);
});

trailLengthSlider.addEventListener('input', () => {
  const val = parseFloat(trailLengthSlider.value);
  log.info('拖尾长度调整', { length: val });
  trailLengthVal.textContent = val.toFixed(1);
  setTrailLength(val);
});

// --- Fullscreen toggle ---
const btnFullscreen = document.getElementById('btn-fullscreen');

btnFullscreen.addEventListener('click', async () => {
  const full = await isFullscreen();
  log.info('全屏切换', { from: full, to: !full });
  try {
    await setFullscreen(!full);
    btnFullscreen.classList.toggle('is-fullscreen', !full);
  } catch (err) {
    log.error('全屏切换失败', err);
  }
});

// --- Theme toggle ---
const btnTheme = document.getElementById('btn-theme');
const themeRipple = document.getElementById('theme-ripple');

btnTheme.addEventListener('click', () => {
  const prev = getTheme();
  const next = prev === 'dark' ? 'light' : 'dark';
  log.info('主题切换', { from: prev, to: next });
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
    applyTheme(next);

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

// --- Tray integration ---
let trayAlwaysOnTop = false;

function pushTrayStatus() {
  if (!isTauri) return;
  const remaining = timer.getRemainingMs();
  const status = `${mode === 'focus' ? '专注' : '休息'} ${formatTime(Math.ceil(remaining / 1000))} · ${completedCycles}/${cycleCount}`;
  const playPause = timer.isRunning() ? '暂停' : '开始';
  updateTrayStatus(status, playPause, trayAlwaysOnTop);
}

function showUpdateDialog(update) {
  log.info('显示更新对话框', { version: update.version });
  const msg = `新版本 ${update.version} 可用\n\n${update.body || ''}\n\n是否立即更新？`;
  if (confirm(msg)) {
    log.info('用户确认更新');
    if (window.__TAURI__?.updater) {
      window.__TAURI__.updater.downloadAndInstall().catch(err => {
        log.error('更新下载安装失败', err);
      });
    }
  } else {
    log.info('用户取消更新');
  }
}

// --- Init ---
(async function init() {
  log.info('=== 番茄钟初始化开始 ===');
  log.info('运行环境', { isTauri, userAgent: navigator.userAgent });

  const saved = (() => { try { return localStorage.getItem('pomodoro-theme'); } catch { return null; } })();
  applyTheme(saved || 'dark');

  modeLabel.classList.add('mode-focus');
  timeDisplay.classList.add('mode-focus');
  updateModeLabel();

  // Window controls
  const btnMinimize = document.getElementById('btn-minimize');
  const btnClose = document.getElementById('btn-close');
  if (btnMinimize) btnMinimize.addEventListener('click', () => minimizeWindow());
  if (btnClose) btnClose.addEventListener('click', () => closeWindow());

  // Tauri event listeners
  if (isTauri) {
    log.info('注册 Tauri 事件监听');
    const { getCurrentWindow } = window.__TAURI__.window;

    getCurrentWindow().listen('tauri://resize', () => {
      getCurrentWindow().isFullscreen().then(f => {
        btnFullscreen.classList.toggle('is-fullscreen', f);
      });
    });

    // Tray menu events
    listenTrayEvent('tray:play-pause', () => {
      log.info('托盘菜单：播放/暂停');
      btnPlay.click();
    });
    listenTrayEvent('tray:reset', () => {
      log.info('托盘菜单：重置');
      btnReset.click();
    });
    listenTrayEvent('tray:toggle-always-on-top', async () => {
      log.info('托盘菜单：切换置顶');
      try {
        trayAlwaysOnTop = await toggleAlwaysOnTop();
        pushTrayStatus();
      } catch (err) {
        log.error('托盘置顶切换失败', err);
      }
    });
    listenTrayEvent('tray:check-update', async () => {
      log.info('托盘菜单：检查更新');
      try {
        const update = await checkUpdate();
        if (update?.available) {
          showUpdateDialog(update);
        } else if (update) {
          sendNotification('番茄钟', '已是最新版本');
          log.info('当前已是最新版本');
        }
      } catch (err) {
        log.error('托盘更新检查失败', err);
      }
    });

    // Startup update check
    setTimeout(async () => {
      log.info('启动后自动检查更新');
      try {
        const update = await checkUpdate();
        if (update?.available) showUpdateDialog(update);
      } catch (err) {
        log.error('启动更新检查失败', err);
      }
    }, 3000);

    // Autostart toggle
    const toggleAutostart = document.getElementById('toggle-autostart');
    if (toggleAutostart) {
      try {
        const enabled = await isAutostartEnabled();
        toggleAutostart.classList.toggle('active', enabled);
        log.info('开机自启初始状态', { enabled });
      } catch (err) {
        log.error('读取开机自启状态失败', err);
      }
      toggleAutostart.addEventListener('click', async () => {
        const enabled = !toggleAutostart.classList.contains('active');
        log.info('切换开机自启', { enabled });
        try {
          await setAutostart(enabled);
          toggleAutostart.classList.toggle('active', enabled);
        } catch (err) {
          log.error('设置开机自启失败', err);
        }
      });
    }
  }

  log.info('=== 番茄钟初始化完成 ===');
})();

// --- Animation loop ---
let lastTime = performance.now();

function animate() {
  const now = performance.now();
  const deltaTime = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  requestAnimationFrame(animate);

  timer.tick();
  updateParticles(deltaTime);
  renderRing(deltaTime);

  if (aboutBackdrop.classList.contains('open')) {
    spawnAboutParticles(deltaTime);
    updateAboutParticles(deltaTime);
    renderAboutParticles();
  }

  renderer.render(scene, camera);
}

// --- Global error handler ---
window.addEventListener('error', (e) => {
  log.error('未捕获的错误', { message: e.message, source: e.filename, line: e.lineno });
});

window.addEventListener('unhandledrejection', (e) => {
  log.error('未处理的 Promise 拒绝', { reason: e.reason });
});

// --- Resize ---
window.addEventListener('resize', () => {
  log.debug('窗口大小变更', { width: window.innerWidth, height: window.innerHeight });
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeRing();
  if (aboutBackdrop.classList.contains('open')) {
    initAboutParticleCanvas();
  }
});

animate();
