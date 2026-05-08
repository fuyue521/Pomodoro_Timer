# PRD: 3D 番茄钟 (Pomodoro Timer with Three.js)

## Introduction

基于 Three.js 的立体场景番茄钟应用。通过 3D 旋转圆环倒计时、粒子背景和中央数字显示，提供沉浸式的专注计时体验。支持可自定义的专注/休息时长、浏览器通知和音效提醒。

## Design Philosophy

**方向：精炼极简 × 沉浸氛围 (Refined Minimalism × Atmospheric Depth)**

这不是一个工具面板，而是一个"专注仪式"的空间。用户打开它，进入一个深邃的暗色空间，唯一的焦点是缓慢旋转的光环和倒计时数字。设计的关键词是：**克制、呼吸感、仪式感**。

- **Tone**: 精炼的极简主义 — 不是"少就是多"，而是"少就是一切"。每个像素都要有存在理由。
- **Differentiation**: 暖橙光环在近乎纯黑的虚空里旋转，粒子像暗夜中的余烬缓慢漂浮，营造一种"时间在流动"的沉浸感。这不是常见的扁平番茄钟面板，而是一个有深度的 3D 仪式空间。

## Goals

- 提供视觉沉浸的 3D 番茄钟倒计时体验
- 支持专注模式（默认 25 分钟）和休息模式（默认 5 分钟），时长可自定义
- 圆环进度随时间递减，粒子背景营造氛围，中央大字显示剩余时间
- 番茄周期计数，追踪用户完成的番茄数
- 番茄/休息结束时通过浏览器通知 + 音效提醒用户
- 极简暗色 UI，仅保留必要控件

## User Stories

### US-001: 项目脚手架搭建
**Description:** As a developer, I want a Vite + Three.js 项目脚手架，支持模块化开发和 HMR。

**Acceptance Criteria:**
- [ ] 使用 Vite (vanilla JS 模板) 初始化项目
- [ ] 安装 three 依赖（无其他运行时依赖）
- [ ] 项目结构：`index.html` / `src/main.js` / `src/scene.js` / `src/timer.js` / `src/audio.js`（最多 6 个源文件）
- [ ] `npm run dev` 启动开发服务器，空白页面无报错
- [ ] 无需 TypeScript、ESLint 等配置（vanilla JS 足够）

### US-002: 3D 场景基础搭建
**Description:** As a user, I want to see a 3D 暗色场景，包含旋转的进度圆环和粒子背景。

**Acceptance Criteria:**
- [ ] 使用 Three.js WebGLRenderer + PerspectiveCamera，背景色 `#050505`（非纯黑，带微弱暖色偏）
- [ ] 渲染一个 TorusGeometry 环面（majorRadius=3, minorRadius=0.15, tubularSegments=128），材质使用 MeshStandardMaterial + emissive 自发光
- [ ] 环面初始完整（arc=2π），绕 Y 轴缓慢匀速自转
- [ ] 粒子系统：~800 个点，使用 BufferGeometry + PointsMaterial，粒子在球形区域内缓慢上浮并随机漂移
- [ ] 场景使用 ReinhardToneMapping，营造柔和的高光衰减
- [ ] resize 处理：camera aspect 和 renderer size 随窗口更新
- [ ] 验证：浏览器中可见旋转发光圆环 + 漂浮粒子

### US-003: 中央倒计时数字显示
**Description:** As a user, I want 3D 场景中央显示大号倒计时数字，直观查看剩余时间。

**Acceptance Criteria:**
- [ ] 使用 CSS overlay（绝对定位 div）渲染在 canvas 上方，非 Canvas 纹理方案
- [ ] 字体使用 'DM Mono' 或 'Space Mono'（Google Fonts 加载），避免 Arial/Inter/Roboto 等通用字体
- [ ] 格式 MM:SS，字号 clamp(64px, 10vw, 120px)，颜色 `#f0e6d3`（暖白，非纯白 #fff）
- [ ] 数字带有 CSS text-shadow 微弱发光
- [ ] 模式切换时数字有淡入淡出过渡（CSS transition opacity 0.5s）
- [ ] 验证：浏览器中可见中央倒计时数字，字体已加载

### US-004: 番茄倒计时核心逻辑
**Description:** As a user, I want 番茄钟按设定时长倒计时，时间递减并驱动圆环进度变化。

**Acceptance Criteria:**
- [ ] 倒计时基于 `Date.now()` 差值计算，避免 setInterval 漂移（精度 < 1s）
- [ ] 圆环 arc 参数实时更新：`arc = (remainingSeconds / totalSeconds) * 2 * Math.PI`
- [ ] 圆环 arc 从 2π（满）递减到 0（空），递减方向与旋转方向一致（顺时针）
- [ ] 中央数字每秒更新（仅在秒数实际变化时更新 DOM，不做无意义渲染）
- [ ] 倒计时归零时自动触发 onComplete 回调
- [ ] 验证：启动后圆环和数字同步递减，24:59 → 24:58 → ...

### US-005: 开始/暂停/重置控制
**Description:** As a user, I want 通过按钮控制番茄钟的启动、暂停和重置。

**Acceptance Criteria:**
- [ ] overlay 底部居中显示两个按钮：播放/暂停（同一按钮切换图标）和重置
- [ ] 按钮为半透明圆角胶囊形：`background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 50px`
- [ ] hover 时背景变亮至 `rgba(255,255,255,0.12)`，transition 0.3s
- [ ] 暂停时圆环旋转停止（或极慢速），粒子动画继续（保持氛围）
- [ ] 重置时倒计时恢复初始时长，圆环恢复完整，不重置番茄计数
- [ ] 验证：点击播放→圆环开始递减+旋转→点击暂停→停止递减→点击播放→继续

### US-006: 专注/休息模式自动切换
**Description:** As a user, I want 专注结束后自动进入休息模式，休息结束后自动回到专注模式。

**Acceptance Criteria:**
- [ ] 专注倒计时结束 → 自动切换到休息模式（默认 5min），重置倒计时
- [ ] 休息倒计时结束 → 自动切换到专注模式（默认 25min），重置倒计时
- [ ] 模式切换时圆环颜色过渡：
  - 专注模式：emissive `#FF6B35`（暖橙），背景粒子偏暖
  - 休息模式：emissive `#4CAF50`（绿），背景粒子偏冷
- [ ] 模式切换动画：圆环颜色在 0.8s 内平滑过渡（通过更新 material.emissive）
- [ ] 中央数字上方显示当前模式标签（"专注" / "休息"），字号较小，颜色与圆环一致
- [ ] 验证：完整走完一轮 专注(25min)→自动→休息(5min)→自动→专注(25min)

### US-007: 番茄周期计数
**Description:** As a user, I want 看到当前已完成番茄数量的计数。

**Acceptance Criteria:**
- [ ] 数字下方以小型暖色圆点表示已完成番茄（如 `●●●` 表示 3 个）
- [ ] 每完成一个专注周期，增加一个圆点
- [ ] 圆点淡入动画（CSS animation fadeIn）
- [ ] 重置倒计时不影响番茄计数
- [ ] 验证：完成两个专注周期后，显示 2 个圆点

### US-008: 浏览器通知 + 音效提醒
**Description:** As a user, I want 番茄/休息结束时收到浏览器通知和音效提醒。

**Acceptance Criteria:**
- [ ] 专注结束：`new Notification('番茄完成', { body: '休息一下吧 🍅' })`
- [ ] 休息结束：`new Notification('休息结束', { body: '开始新的番茄' })`
- [ ] 首次点击播放时请求 Notification.permission（不提前请求，避免骚扰）
- [ ] 音效使用 Web Audio API OscillatorNode：
  - 专注结束：800Hz + 600Hz 双音，0.15s，type='sine'
  - 休息结束：600Hz + 400Hz 双音，0.1s，type='sine'
  - 不使用外部音频文件
- [ ] 用户未授权通知时，仅播放音效，不报错
- [ ] 验证：倒计时结束时听到提示音 + 看到浏览器通知

### US-009: 可自定义时长设置
**Description:** As a user, I want 调整专注时长和休息时长。

**Acceptance Criteria:**
- [ ] 右上角齿轮图标按钮（SVG inline），点击展开设置面板
- [ ] 设置面板为下拉/弹出式，背景 `rgba(20,20,20,0.95)`，border 同按钮风格
- [ ] 专注时长：滑块或 +/- 按钮，范围 5–60 分钟，步长 5
- [ ] 休息时长：滑块或 +/- 按钮，范围 1–15 分钟，步长 1
- [ ] 修改后立即生效，当前若未开始则重置为新时长
- [ ] 点击面板外区域关闭面板
- [ ] 验证：设置专注 15min → 倒计时显示 15:00

## Functional Requirements

- FR-1: Three.js WebGLRenderer + PerspectiveCamera，背景 `#050505`，ReinhardToneMapping
- FR-2: TorusGeometry 进度圆环，arc 参数 = 剩余时间比例 × 2π，emissive 发光
- FR-3: 圆环非暂停时绕 Y 轴旋转（~0.3 rad/s）
- FR-4: ~800 粒子在球形区域内缓慢上浮，带随机漂移，颜色随模式在暖/冷之间过渡
- FR-5: CSS overlay 渲染 MM:SS 倒计时数字，字体 DM Mono / Space Mono
- FR-6: 倒计时使用 Date.now() 差值驱动，requestAnimationFrame 循环中检查秒数变化
- FR-7: 播放/暂停共用胶囊按钮；重置按钮独立
- FR-8: 专注模式 emissive `#FF6B35`；休息模式 emissive `#4CAF50`，切换时 0.8s 颜色过渡
- FR-9: 自动切换：专注结束→休息、休息结束→专注
- FR-10: 番茄计数以暖色圆点显示，每个专注周期 +1
- FR-11: Notification API 通知 + Web Audio API OscillatorNode 提示音
- FR-12: 设置面板：专注 5-60min / 休息 1-15min，齿轮图标触发
- FR-13: window resize → 更新 camera + renderer
- FR-14: 页面 <head> 预加载字体，避免 FOUT

## Coding Principles (Karpathy Guidelines)

- **Simplicity First**: 不用框架（React/Vue），vanilla JS 足够。不引入状态管理库、路由、构建优化插件。最多 6 个源文件。
- **No Speculative Features**: 不预留用户系统、不预留主题切换、不预留多语言。PRD 以外的一律不做。
- **No Premature Abstractions**: 一个函数只被调用一次？不要抽取。三个相似行？不要泛化。等第二次出现时再抽象。
- **Surgical Edits**: 修改代码时只改与当前任务相关的行，不顺手改格式、不顺手删"看起来没用"的代码。
- **Goal-Driven**: 每个 US 完成后在浏览器中验证，确认 AC 全部通过再进入下一个 US。

## Design Specifications

### Typography
- **计时数字**: 'DM Mono' (Google Fonts, 400 weight) — 几何感等宽字体，数字清晰锐利
- **UI 文字**: 'DM Mono' 同一字体家族，保持统一
- **字号梯度**: 计时数字 clamp(64px, 10vw, 120px) / 模式标签 14px / 按钮 13px / 设置面板 12px
- **颜色梯度**: 数字 `#f0e6d3` / 标签 `rgba(240,230,211,0.7)` / 按钮文字 `rgba(255,255,255,0.6)`

### Color System (CSS Variables)
```css
:root {
  --bg-deep: #050505;
  --text-primary: #f0e6d3;
  --text-dim: rgba(240, 230, 211, 0.5);
  --accent-focus: #FF6B35;
  --accent-break: #4CAF50;
  --btn-bg: rgba(255, 255, 255, 0.06);
  --btn-border: rgba(255, 255, 255, 0.1);
  --btn-hover: rgba(255, 255, 255, 0.12);
}
```

### Atmosphere & Visual Depth
- CSS 全屏 noise/grain overlay（SVG feTurbulence + opacity 0.03），叠加在 canvas 上方
- 页面边缘微弱的 CSS radial-gradient vignette 效果
- 圆环 emissive 光晕通过调整 material emissiveIntensity=0.6 实现，不额外添加 bloom 后处理

### Motion
- 圆环自转：匀速 0.3 rad/s，暂停时减速至 0（ease-out 过渡）
- 模式切换颜色过渡：0.8s ease-in-out
- 粒子：始终运动，不受暂停影响（保持空间"活"的感觉）
- 按钮 hover：0.3s ease
- 数字淡入淡出：opacity transition 0.5s
- 设置面板弹出：opacity + translateY，0.25s ease-out

### Spatial Composition
- 3D canvas 占满全屏
- 数字 overlay 垂直居中，水平居中
- 模式标签在数字上方 24px
- 番茄圆点在数字下方 32px
- 按钮组在页面底部 60px
- 设置齿轮在右上角 32px

## Non-Goals

- 不包含用户账户或数据持久化
- 不包含任务/待办列表管理
- 不包含统计图表或历史记录
- 不包含多语言支持（仅中文）
- 不包含移动端适配（桌面浏览器优先）
- 不包含长休息模式
- 不包含键盘快捷键
- 不包含 PWA / Service Worker

## Technical Constraints

- **运行时依赖**: 仅 `three`（v0.170+），无其他 npm 依赖
- **构建工具**: Vite (vanilla JS 模板)
- **浏览器要求**: Chrome/Edge/Firefox 最近 2 个大版本，支持 WebGL
- **源文件上限**: 6 个 JS 文件（main.js / scene.js / torus.js / particles.js / timer.js / audio.js）+ 1 个 HTML + 1 个 CSS
- **不使用**: TypeScript、React、Vue、Tailwind、PostCSS、Sass

## Success Metrics

- 倒计时精度：与系统时钟偏差 < 1 秒
- 帧率：60fps（粒子场景 + 圆环渲染）
- 交互延迟：按钮点击到状态变化 < 100ms
- Bundle 大小：< 500KB（含 three.js）

## Implementation Tasks

> 将原 US 中过大的任务拆解为单次可实现的原子任务。每个任务独立可验证，标注了依赖和预估代码量。

### Phase 1: 项目骨架 (2 tasks)

#### T-001: Vite 脚手架 + 基础 HTML/CSS
**依赖**: 无 | **预估**: ~60 行
- [ ] `npm create vite@latest . -- --template vanilla` 初始化
- [ ] `npm install three` 安装唯一依赖
- [ ] `index.html`：全屏黑色背景 `#050505`，移除 Vite 默认模板内容
- [ ] `<head>` 中预加载 DM Mono 字体（Google Fonts）
- [ ] CSS 变量定义（--bg-deep / --text-primary / --accent-focus / --accent-break 等，参考 Design Specifications）
- [ ] `<div id="timer-overlay">` 占位（后续任务填充内容）
- [ ] `<canvas id="three-canvas">` 占位
- **验证**: `npm run dev` 启动无报错，页面纯黑背景，DevTools Network 显示字体已加载

#### T-002: Three.js 场景骨架 (scene.js)
**依赖**: T-001 | **预估**: ~50 行
- [ ] 创建 `src/scene.js`，导出 `initScene(canvas)` 函数
- [ ] WebGLRenderer（antialias: true, alpha: false），setPixelRatio(Math.min(devicePixelRatio, 2))
- [ ] PerspectiveCamera（fov=60, near=0.1, far=100, position.z=8）
- [ ] renderer.setClearColor(0x050505)，ToneMapping=ReinhardToneMapping
- [ ] 添加 AmbientLight(0xffffff, 0.3) + DirectionalLight(0xff6b35, 0.5) 用于圆环基础照明
- [ ] 导出 `{ renderer, camera, scene }` 供其他模块使用
- **验证**: 页面显示纯黑画布，无 WebGL 错误，无几何体可见（还没加圆环）

### Phase 2: 3D 视觉元素 (4 tasks)

#### T-003: 进度圆环 (torus.js)
**依赖**: T-002 | **预估**: ~40 行
- [ ] 创建 `src/torus.js`，导出 `createTorus(scene)` 和 `updateTorus(torus, arcProgress)`
- [ ] TorusGeometry(majorRadius=3, minorRadius=0.15, radialSegments=16, tubularSegments=128, arc=2π)
- [ ] MeshStandardMaterial({ color: 0xff6b35, emissive: 0xff6b35, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.1 })
- [ ] 初始 arc=Math.PI*2（完整圆环），圆环平放在 XZ 平面（rotation.x = Math.PI/2）
- [ ] `updateTorus()` 重新设置 geometry 的 drawRange.count 来控制可见弧长（或重建 geometry）
- **验证**: 场景中可见完整暖橙色发光圆环，静止

#### T-004: 圆环自转动画 (在 main.js 渲染循环)
**依赖**: T-003 | **预估**: ~30 行
- [ ] 创建 `src/main.js`，组装 scene + torus，启动 requestAnimationFrame 循环
- [ ] 渲染循环中圆环绕 Y 轴旋转：`torus.rotation.z += 0.01`（注意 rotation.x 已设 π/2，绕 Y 旋转需改 rotation.z）
- [ ] 调用 `renderer.render(scene, camera)`
- **验证**: 圆环在场景中缓慢自转，60fps 流畅

#### T-005: 粒子系统 (particles.js)
**依赖**: T-002 | **预估**: ~50 行
- [ ] 创建 `src/particles.js`，导出 `createParticles(scene)` 和 `updateParticles(particles, deltaTime)`
- [ ] BufferGeometry + 800 个顶点，球形随机分布（半径 5-15），使用 THREE.Spherical 或随机向量
- [ ] PointsMaterial({ color: 0xffaa66, size: 0.03, transparent: true, opacity: 0.6, blending: AdditiveBlending })
- [ ] `updateParticles()` 中每个粒子 y+=0.002，超出范围后重置到底部，加微小 x/z 漂移
- [ ] 粒子始终运动（不受暂停影响）
- **验证**: 圆环周围可见暖色粒子缓慢上浮，如余烬飘动

#### T-006: 窗口 resize 响应
**依赖**: T-004 | **预估**: ~15 行
- [ ] window.addEventListener('resize', ...)
- [ ] 更新 camera.aspect = width/height，camera.updateProjectionMatrix()
- [ ] 更新 renderer.setSize(width, height)
- **验证**: 缩放浏览器窗口，圆环不变形，场景比例正确

### Phase 3: 计时核心 (3 tasks)

#### T-007: CSS Overlay 数字显示
**依赖**: T-001 | **预估**: ~40 行 CSS + ~15 行 HTML
- [ ] `#timer-overlay` 绝对定位覆盖全屏，pointer-events: none（不阻挡 canvas 下方无按钮区域的交互？按钮需要可点击，所以 overlay 子元素各自控制 pointer-events）
- [ ] 中央数字 `<div id="time-display">25:00</div>`，字体 DM Mono，字号 clamp(64px, 10vw, 120px)
- [ ] text-shadow 微弱发光：`0 0 40px rgba(255,107,53,0.3)`
- [ ] `<div id="mode-label">专注</div>` 在数字上方 24px，字号 14px，颜色与模式对应
- [ ] 模式切换时 opacity transition 0.5s
- **验证**: 页面中央显示 "25:00"，暖白发光，字体已加载

#### T-008: 倒计时引擎 (timer.js)
**依赖**: T-007 | **预估**: ~60 行
- [ ] 创建 `src/timer.js`，导出 `createTimer(onTick, onComplete)`
- [ ] 状态：`{ remainingMs, totalMs, running }`
- [ ] `start()`: 记录 `startTime = Date.now()`，running=true
- [ ] `pause()`: 计算已过时间，更新 remainingMs，running=false
- [ ] `reset()`: remainingMs = totalMs，running=false
- [ ] 渲染循环中调用 `tick()`：若 running，用 Date.now() - startTime 计算剩余秒数，仅在秒数变化时触发 onTick(remainingSec, totalSec)
- [ ] 剩余秒数 = 0 时触发 onComplete()
- **验证**: console.log 输出倒计时 25:00 → 24:59 → 24:58 ...（先用短时间测试，如 5 秒）

#### T-009: 圆环 arc 与倒计时联动
**依赖**: T-004 + T-008 | **预估**: ~20 行 (修改 main.js)
- [ ] main.js 中连接 timer.onTick → updateTorus(torus, remaining/total)
- [ ] updateTorus 中重建 TorusGeometry 的 arc 参数（或使用 setDrawRange）
- [ ] 圆环从 2π（满）递减到 0（空），递减方向与旋转方向视觉一致
- **验证**: 倒计时启动后圆环随数字同步递减，5→4→3→2→1→0 圆环消失

### Phase 4: 交互控制 (2 tasks)

#### T-010: 按钮 UI
**依赖**: T-007 | **预估**: ~40 行 CSS + ~25 行 HTML
- [ ] 底部居中按钮组 `<div id="controls">`
- [ ] 播放/暂停按钮：`<button id="btn-play">` — 初始显示 ▶ 图标（SVG inline），点击后切换为 ⏸
- [ ] 重置按钮：`<button id="btn-reset">` — ↺ 图标
- [ ] 胶囊形样式：半透明背景、细边框、50px 圆角，hover 变亮，transition 0.3s
- [ ] 按钮文字颜色 `rgba(255,255,255,0.6)`，字号 13px
- **验证**: 两个胶囊按钮在底部居中，hover 有过渡效果，点击有视觉反馈

#### T-011: 按钮控制逻辑
**依赖**: T-008 + T-010 | **预估**: ~30 行 (修改 main.js)
- [ ] 播放按钮 click → timer.start()，图标切换为 ⏸
- [ ] 暂停按钮 click → timer.pause()，图标切换为 ▶
- [ ] 重置按钮 click → timer.reset()，图标恢复 ▶，数字恢复初始值
- [ ] 暂停时圆环旋转停止（通过控制旋转速度变量）
- [ ] 重置时圆环恢复完整 arc
- **验证**: 播放→数字递减圆环转→暂停→停止→继续→重置→恢复 25:00

### Phase 5: 模式与功能 (5 tasks)

#### T-012: 专注/休息双模式
**依赖**: T-009 + T-011 | **预估**: ~50 行 (修改 main.js + timer.js)
- [ ] 定义模式状态：`mode: 'focus' | 'break'`
- [ ] focus: totalSec=25*60, color=0xFF6B35；break: totalSec=5*60, color=0x4CAF50
- [ ] 模式切换函数 `switchMode(newMode)`：更新圆环 emissive 颜色（0.8s 过渡，在渲染循环中用 lerp 实现）
- [ ] 模式标签 "专注" / "休息" 随模式切换，颜色同步
- [ ] 粒子颜色随模式切换（暖橙 ↔ 冷绿）
- **验证**: 手动调用切换，圆环从橙色过渡到绿色，标签同步变化

#### T-013: 自动切换 + onComplete 流程
**依赖**: T-012 | **预估**: ~30 行
- [ ] focus 倒计时结束 → 自动调用 switchMode('break')，reset 倒计时，自动开始
- [ ] break 倒计时结束 → 自动调用 switchMode('focus')，reset 倒计时，自动开始
- [ ] 番茄计数仅在 focus 结束时 +1（在 onComplete 中判断 mode）
- **验证**: focus 5s→结束→自动切 break 3s→结束→自动切 focus 5s（测试用短时间）

#### T-014: 番茄计数圆点
**依赖**: T-013 | **预估**: ~25 行
- [ ] overlay 中数字下方 32px 放置 `<div id="pomodoro-dots">`
- [ ] 每完成一个专注周期，动态插入一个 `<span class="dot">`（暖橙色圆点，8px，border-radius 50%）
- [ ] 新圆点 CSS fadeIn 动画（opacity 0→1, 0.5s）
- [ ] 重置倒计时不影响计数
- **验证**: 完成 2 个专注周期后，显示 2 个暖橙圆点

#### T-015: Web Audio 提示音 (audio.js)
**依赖**: T-013 | **预估**: ~35 行
- [ ] 创建 `src/audio.js`，导出 `playFocusEndSound()` 和 `playBreakEndSound()`
- [ ] 使用 AudioContext + OscillatorNode，不依赖外部音频文件
- [ ] focusEnd: 两个 oscillator（800Hz + 600Hz），type='sine'，0.15s 后 stop，gain 渐弱
- [ ] breakEnd: 两个 oscillator（600Hz + 400Hz），type='sine'，0.1s 后 stop
- [ ] AudioContext 在首次用户交互时 resume（处理浏览器 autoplay 策略）
- **验证**: 调用 playFocusEndSound() 听到双音提示

#### T-016: 浏览器通知 + 结束流程整合
**依赖**: T-013 + T-015 | **预估**: ~25 行
- [ ] 首次点击播放时调用 `Notification.requestPermission()`
- [ ] focus 结束：`new Notification('番茄完成', { body: '休息一下吧 🍅' })` + playFocusEndSound()
- [ ] break 结束：`new Notification('休息结束', { body: '开始新的番茄' })` + playBreakEndSound()
- [ ] 权限被拒时静默跳过通知，音效正常播放
- **验证**: 倒计时结束 → 听到提示音 + 浏览器弹出通知

#### T-017: 设置面板
**依赖**: T-013 | **预估**: ~60 行
- [ ] 右上角齿轮 SVG 图标按钮（32px，position: fixed）
- [ ] 点击弹出设置面板：`position: absolute; background: rgba(20,20,20,0.95); border-radius: 12px; padding: 20px`
- [ ] 专注时长：标签 "专注时长" + 滑块/数值显示，range 5-60，step 5
- [ ] 休息时长：标签 "休息时长" + 滑块/数值显示，range 1-15，step 1
- [ ] 修改后更新 timer 的 totalSec，若未在运行则立即刷新数字显示
- [ ] 点击面板外部关闭（document click listener）
- **验证**: 齿轮→面板展开→拖专注到 15min→数字显示 15:00→点击外部→面板关闭

---

### 任务依赖关系

```
T-001 ──→ T-002 ──→ T-003 ──→ T-004
  │                    │          │
  │                    │          └──→ T-009 ←── T-008 ←── T-007
  │                    │                   │
  │                    └──→ T-005          │
  │                         │              │
  │                         └──→ T-006     │
  │                                        │
  ├──→ T-007 ──→ T-008                     │
  │              │                         │
  │              └──→ T-010 ──→ T-011      │
  │                            │           │
  │                            └──→ T-012 ←┘
  │                                   │
  │                                   ├──→ T-013
  │                                   │      │
  │                                   │      ├──→ T-014
  │                                   │      ├──→ T-015
  │                                   │      └──→ T-016
  │                                   │
  │                                   └──→ T-017
```

### 执行顺序建议

| 序号 | 任务 | 累计可验证成果 |
|------|------|---------------|
| 1 | T-001 | 项目跑起来，黑背景 |
| 2 | T-002 | 3D 场景初始化 |
| 3 | T-003 | 圆环可见 |
| 4 | T-004 | 圆环自转 |
| 5 | T-005 | 粒子漂浮 |
| 6 | T-006 | 窗口缩放适配 |
| 7 | T-007 | 数字显示 |
| 8 | T-008 | 倒计时逻辑 |
| 9 | T-009 | 圆环跟随倒计时 |
| 10 | T-010 | 按钮可见 |
| 11 | T-011 | 按钮可用 |
| 12 | T-012 | 双模式 + 颜色过渡 |
| 13 | T-013 | 自动切换 |
| 14 | T-014 | 番茄计数 |
| 15 | T-015 | 提示音 |
| 16 | T-016 | 浏览器通知 |
| 17 | T-017 | 设置面板 |

每次完成一个任务，浏览器中验证对应 AC，确认无误后进入下一个。

## Open Questions

- 专注/休息模式是否使用不同粒子颜色？
- 最后 5 秒是否需要视觉强调（圆环脉动/闪烁）？
