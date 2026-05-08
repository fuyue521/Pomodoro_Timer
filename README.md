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
      <p>点击左上角按钮，径向涟漪动画平滑切换。粒子、光环、UI 全局联动。用户自定义颜色不受影响。</p>
    </td>
    <td width="50%">
      <h3>⏱️ 专注 + 休息自动循环</h3>
      <p>专注 25 分钟 → 休息 5 分钟 → 自动切换，可自定义时长（5–60min / 1–15min）和循环次数（1–12 轮）。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🌀 动态光环倒计时</h3>
      <p>2D Canvas 渲染的时间环，弧长随剩余时间递减。运行时端点喷出粒子火花，暂停时静止。</p>
    </td>
    <td>
      <h3>🌌 3D 粒子宇宙</h3>
      <p>800 个暖色粒子在 Three.js 场景中缓慢上浮，营造"时间流动"的沉浸氛围，不受暂停影响。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🔔 浏览器通知 + 音效</h3>
      <p>番茄/休息结束时弹出桌面通知，伴随 Web Audio 双音提示，专注时不需盯着屏幕。</p>
    </td>
    <td>
      <h3>🎛️ 可折叠设置面板</h3>
      <p>右上角齿轮展开，调整时长、循环次数、粒子/光环/火花颜色。分区折叠，悬停立体感。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🍅 番茄计数</h3>
      <p>每完成一个专注周期，界面上多一颗暖橙色圆点，淡入动画，直观追踪今日进度。</p>
    </td>
    <td>
      <h3>🪟 毛玻璃弹窗</h3>
      <p>"关于作者" 弹窗带 backdrop-filter 模糊遮罩，窗口边缘持续溢出彩色粒子。</p>
    </td>
  </tr>
</table>

---

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/fuyue521/pomodoro-timer.git
cd pomodoro-timer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5173` 即可体验。

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

## 📁 项目结构

```
Pomodoro_Timer/
├── index.html              # 入口 HTML + 完整 DOM 结构
├── package.json            # Vite + Three.js 依赖
├── README.md
├── src/
│   ├── main.js             # 应用入口：渲染循环、按钮逻辑、主题切换、弹窗
│   ├── scene.js            # Three.js 渲染器、相机、光照
│   ├── ring.js             # 2D Canvas 时间环：进度弧 + 火花粒子
│   ├── particles.js        # Three.js 粒子系统：800 粒子漂浮动画
│   ├── timer.js            # 倒计时引擎：Date.now() 差值驱动，零漂移
│   ├── audio.js            # Web Audio API 提示音（OscillatorNode）
│   └── style.css           # 全局样式：双主题变量、毛玻璃、动画
└── tasks/
    ├── prd-pomodoro-threejs.md    # PRD 设计文档
    └── implementation-log.md      # 实现日志
```

**零运行时依赖**（Three.js 除外）。不依赖 React/Vue/Tailwind，纯 Vanilla JS + CSS。

---

## 🎮 使用方式

| 操作 | 说明 |
|------|------|
| **▶ / ⏸** | 底部胶囊按钮——开始 / 暂停倒计时 |
| **↺** | 重置——恢复当前模式初始时长，不清除番茄计数 |
| **齿轮 ⚙** | 右上角——展开设置面板（时长、循环、配色） |
| **日月 ☀️🌙** | 左上角——切换深色 / 浅色主题（涟漪动画） |
| **设置 → 关于作者** | 弹出毛玻璃窗口，查看版本与联系方式 |

---

## 🎨 自定义

设置面板中的「自定义」分区提供三个颜色选择器：

- **背景粒子颜色** — Three.js 场景中漂浮粒子的颜色
- **时间环颜色** — 倒计时光环的颜色
- **端点粒子颜色** — 光环缺口处火花粒子的颜色

切换主题时，**仅重置与当前主题默认值一致的颜色**——已自定义的颜色会被保留。

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 3D 渲染 | Three.js WebGLRenderer + Reinhard Tone Mapping |
| 2D 光环 | Canvas 2D API（弧线 + 粒子系统） |
| 构建工具 | Vite（HMR 开发 + 生产打包） |
| 字体 | DM Mono（Google Fonts，几何等宽字体） |
| 音频 | Web Audio API OscillatorNode |
| 通知 | Notification API |
| 样式 | CSS 自定义属性 + backdrop-filter + CSS Transition |

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
