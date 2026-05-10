# 🍅 番茄钟 — 3D 沉浸式番茄工作法计时器

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-0.184-000000?logo=three.js" alt="Three.js">
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Vanilla-JS-F7DF1E?logo=javascript" alt="Vanilla JS">
</p>

<p align="center">
  基于 <strong>Three.js</strong> 的 3D 立体场景番茄钟。<br>
  粒子漂浮、光环倒计时、毛玻璃弹窗——这不只是一个计时器，而是一场专注的<strong>仪式</strong>。
</p>

---

## ✨ 特性

<table>
  <tr>
    <td width="50%">
      <h3>🎨 深色 / 浅色双主题</h3>
      <p>径向涟漪动画平滑切换。粒子、光环、UI 全局联动。每套主题独立记忆自定义颜色。</p>
    </td>
    <td width="50%">
      <h3>⏱️ 专注 + 休息自动循环</h3>
      <p>专注 25 分钟 → 休息 5 分钟 → 自动切换。可自定义时长（5–60min / 1–15min）和循环次数（1–12 轮）。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🌀 动态光环倒计时</h3>
      <p>2D Canvas 渲染的时间环，弧长随剩余时间递减。运行时端点喷出粒子火花，暂停时静止。带外发光晕和端点高亮。</p>
    </td>
    <td>
      <h3>🌌 3D 粒子宇宙</h3>
      <p>800 个暖色粒子在 Three.js 场景中漂浮。专注模式切换为环绕轨道动画。三角形拖尾特效，可调节大小、透明度、拖尾长度。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🔔 浏览器通知 + 音效</h3>
      <p>番茄/休息结束时弹出桌面通知，伴随 Web Audio 双音提示，专注时不需盯着屏幕。</p>
    </td>
    <td>
      <h3>🎛️ 可折叠设置面板</h3>
      <p>右上角齿轮展开。时长、循环、粒子/光环/火花颜色、粒子大小/透明度/拖尾长度、粒子开关。分区折叠，悬停立体感。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🍅 番茄计数</h3>
      <p>每完成一个专注周期，界面上多一颗暖橙色圆点，淡入动画，直观追踪当日进度。</p>
    </td>
    <td>
      <h3>🪟 毛玻璃弹窗</h3>
      <p>"关于作者"弹窗带 backdrop-filter 模糊遮罩，窗口边缘持续溢出彩色粒子。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🖥️ 一键全屏</h3>
      <p>左上角全屏按钮，进入浏览器全屏模式，隐藏标签栏和任务栏，专注无干扰。按 Esc 退出。</p>
    </td>
    <td>
      <h3>📝 结构化日志</h3>
      <p>内置日志系统，支持 DEBUG / INFO / WARN / ERROR 四级，便于调试和问题排查。</p>
    </td>
  </tr>
</table>

---

## 🚀 快速开始

```bash
git clone https://github.com/fuyue521/Pomodoro_Timer.git
cd Pomodoro_Timer
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可体验。

```bash
npm run build     # 构建生产版本，输出到 dist/
npm run preview   # 本地预览构建结果
```

---

## 📁 项目结构

```
Pomodoro_Timer/
├── index.html              # 入口 HTML + 完整 DOM 结构
├── package.json            # Vite + Three.js 依赖
├── vite.config.js          # Vite 构建配置
├── README.md
├── src/
│   ├── main.js             # 应用入口：渲染循环、按钮逻辑、主题切换、弹窗
│   ├── scene.js            # Three.js 渲染器、相机、光照
│   ├── ring.js             # 2D Canvas 时间环：进度弧 + 火花粒子 + 外发光
│   ├── particles.js        # Three.js 粒子系统：800 粒子 + 三角形拖尾
│   ├── timer.js            # 倒计时引擎：Date.now() 差值驱动，零漂移
│   ├── audio.js            # Web Audio API 提示音（OscillatorNode）
│   ├── logger.js           # 结构化日志系统（DEBUG/INFO/WARN/ERROR）
│   └── style.css           # 全局样式：双主题变量、毛玻璃、动画、纹理叠加
```

**零前端框架依赖**（Three.js 除外）。纯 Vanilla JS + CSS。

---

## 🎮 使用方式

| 操作 | 说明 |
|------|------|
| **▶ / ⏸** | 底部胶囊按钮——开始 / 暂停倒计时 |
| **↺** | 重置——恢复当前模式初始时长，不清除番茄计数 |
| **齿轮 ⚙** | 右上角——展开设置面板（时长、循环、配色、粒子参数） |
| **日月 ☀️🌙** | 左上角——切换深色 / 浅色主题（涟漪动画） |
| **全屏 ⛶** | 左上角——进入全屏沉浸模式，Esc 退出 |
| **设置 → 关于作者** | 弹出毛玻璃窗口，查看版本与联系方式 |

---

## 🎨 自定义

设置面板中的「自定义」分区提供：

- **背景粒子开关** — 一键开关 Three.js 粒子特效
- **粒子颜色 / 大小 / 透明度 / 拖尾长度** — 精细调节粒子视觉效果
- **时间环颜色** — 倒计时光环的颜色
- **端点粒子颜色** — 光环缺口处火花粒子的颜色

切换主题时，仅重置与当前主题默认值一致的颜色——已自定义的颜色会被保留。每套主题独立记忆。

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 3D 渲染 | Three.js WebGLRenderer + Reinhard Tone Mapping |
| 2D 光环 | Canvas 2D API（弧线 + 粒子系统 + 发光效果） |
| 构建工具 | Vite（HMR 开发 + 生产打包） |
| 字体 | DM Mono（Google Fonts，几何等宽字体） |
| 音频 | Web Audio API OscillatorNode |
| 通知 | Notification API |
| 样式 | CSS 自定义属性 + backdrop-filter + CSS Transition + SVG 噪点纹理 |

---

## 👤 作者

<p>
  <a href="https://github.com/fuyue521">
    <img src="https://img.shields.io/badge/GitHub-fuyue521-181717?logo=github" alt="GitHub">
  </a>
  <a href="mailto:Zz_println@outlook.com">
    <img src="https://img.shields.io/badge/Email-Zz__println@outlook.com-0078D4?logo=microsoft-outlook" alt="Email">
  </a>
</p>

---

<p align="center">
  <sub>Made with 🍅 and ☕</sub>
</p>
