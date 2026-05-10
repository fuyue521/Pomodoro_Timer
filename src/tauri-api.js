import { createLogger } from './logger.js';

const log = createLogger('tauri-api');

// Runtime detection — true in Tauri desktop, false in browser
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

let invoke, getCurrentWindow, tauriNotification;

if (isTauri) {
  const tauri = window.__TAURI__;
  invoke = tauri.core.invoke;
  getCurrentWindow = () => tauri.window.getCurrentWindow();
  tauriNotification = tauri.notification;
  log.info('Tauri 环境已检测到，桌面 API 已启用');
} else {
  log.info('浏览器环境，使用降级模式');
}

// --- Window controls ---

export async function closeWindow() {
  log.info('关闭按钮：隐藏窗口到托盘');
  if (!isTauri) {
    log.debug('非 Tauri 环境，跳过');
    return;
  }
  try {
    await getCurrentWindow().hide();
    log.info('窗口已隐藏到托盘');
  } catch (err) {
    log.error('隐藏窗口失败', err);
    throw err;
  }
}

export async function minimizeWindow() {
  log.info('最小化按钮：最小化窗口');
  if (!isTauri) {
    log.debug('非 Tauri 环境，跳过');
    return;
  }
  try {
    await getCurrentWindow().minimize();
    log.info('窗口已最小化');
  } catch (err) {
    log.error('最小化窗口失败', err);
    throw err;
  }
}

export async function toggleAlwaysOnTop() {
  log.info('切换窗口置顶');
  if (!isTauri) {
    log.debug('非 Tauri 环境，返回 false');
    return false;
  }
  try {
    const result = await invoke('toggle_always_on_top');
    log.info('窗口置顶状态', { alwaysOnTop: result });
    return result;
  } catch (err) {
    log.error('切换置顶失败', err);
    throw err;
  }
}

export async function setFullscreen(fullscreen) {
  log.info('全屏切换', { fullscreen });
  if (!isTauri) {
    try {
      if (fullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      log.info('浏览器全屏切换成功');
    } catch (err) {
      log.error('浏览器全屏切换失败', err);
    }
    return;
  }
  try {
    await getCurrentWindow().setFullscreen(fullscreen);
    log.info('Tauri 全屏切换成功');
  } catch (err) {
    log.error('Tauri 全屏切换失败', err);
    throw err;
  }
}

export async function isFullscreen() {
  if (!isTauri) return !!document.fullscreenElement;
  try {
    return await getCurrentWindow().isFullscreen();
  } catch (err) {
    log.error('查询全屏状态失败', err);
    return false;
  }
}

// --- Notifications ---

export async function sendNotification(title, body) {
  log.info('发送通知', { title, body });
  if (!isTauri || !tauriNotification) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
        log.info('浏览器通知已发送');
      } catch (err) {
        log.error('浏览器通知发送失败', err);
      }
    } else {
      log.warn('浏览器通知权限未授予');
    }
    return;
  }
  try {
    await tauriNotification.sendNotification({ title, body });
    log.info('Tauri 通知已发送');
  } catch (err) {
    log.error('Tauri 通知发送失败', err);
  }
}

export async function requestNotificationPermission() {
  log.info('请求通知权限');
  if (!isTauri || !tauriNotification) {
    if (Notification.permission === 'default') {
      try {
        const result = await Notification.requestPermission();
        log.info('浏览器通知权限结果', { permission: result });
      } catch (err) {
        log.error('浏览器通知权限请求失败', err);
      }
    }
    return;
  }
  try {
    await tauriNotification.requestPermission();
    log.info('Tauri 通知权限已请求');
  } catch (err) {
    log.error('Tauri 通知权限请求失败', err);
  }
}

// --- Config persistence ---

export async function loadConfig() {
  log.info('加载配置');
  if (!isTauri) {
    try {
      const raw = localStorage.getItem('pomodoro-config');
      const config = raw ? JSON.parse(raw) : {};
      log.info('从 localStorage 加载配置', config);
      return config;
    } catch (err) {
      log.error('从 localStorage 加载配置失败', err);
      return {};
    }
  }
  try {
    const config = await invoke('load_config');
    log.info('从文件加载配置', config);
    return config;
  } catch (err) {
    log.error('从文件加载配置失败', err);
    return {};
  }
}

export async function saveConfig(config) {
  log.info('保存配置', config);
  if (!isTauri) {
    try {
      localStorage.setItem('pomodoro-config', JSON.stringify(config));
      log.info('配置已保存到 localStorage');
    } catch (err) {
      log.error('保存配置到 localStorage 失败', err);
    }
    return;
  }
  try {
    await invoke('save_config', { config });
    log.info('配置已保存到文件');
  } catch (err) {
    log.error('保存配置到文件失败', err);
    throw err;
  }
}

// --- Autostart ---

export async function isAutostartEnabled() {
  log.info('查询开机自启状态');
  if (!isTauri) return false;
  const autostart = window.__TAURI__.autostart;
  if (!autostart) {
    log.warn('autostart 插件不可用');
    return false;
  }
  try {
    const enabled = await autostart.isEnabled();
    log.info('开机自启状态', { enabled });
    return enabled;
  } catch (err) {
    log.error('查询开机自启状态失败', err);
    return false;
  }
}

export async function setAutostart(enable) {
  log.info('设置开机自启', { enable });
  if (!isTauri) return;
  const autostart = window.__TAURI__.autostart;
  if (!autostart) {
    log.warn('autostart 插件不可用');
    return;
  }
  try {
    if (enable) {
      await autostart.enable();
    } else {
      await autostart.disable();
    }
    log.info('开机自启设置成功');
  } catch (err) {
    log.error('设置开机自启失败', err);
    throw err;
  }
}

// --- Updater ---

export async function checkUpdate() {
  log.info('检查更新');
  if (!isTauri) return null;
  const updater = window.__TAURI__.updater;
  if (!updater) {
    log.warn('updater 插件不可用');
    return null;
  }
  try {
    const result = await updater.check();
    if (result?.available) {
      log.info('发现新版本', { version: result.version });
    } else {
      log.info('已是最新版本');
    }
    return result;
  } catch (err) {
    log.error('检查更新失败', err);
    return null;
  }
}

// --- Tray ---

export async function updateTrayStatus(status, playPause, alwaysOnTop) {
  if (!isTauri) return;
  try {
    await invoke('update_tray_status', { status, playPause, alwaysOnTop });
  } catch (err) {
    log.error('更新托盘状态失败', err);
  }
}

export async function listenTrayEvent(event, callback) {
  log.info('注册托盘事件监听', { event });
  if (!isTauri) return;
  try {
    const unlisten = await window.__TAURI__.core.event.listen(event, callback);
    log.info('托盘事件监听已注册', { event });
    return unlisten;
  } catch (err) {
    log.error('注册托盘事件监听失败', { event, error: err });
  }
}

// --- Exports ---

export { isTauri, invoke, getCurrentWindow };
