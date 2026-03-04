# ZenReply 窗口嵌套层级

> 从操作系统窗口到最内层内容，共 **7 层**。本文档记录每层的职责、控制位置和尺寸传递链。

---

## 层级总览

```
① OS Window (Tauri, transparent, 600×auto)
└─② html > body > #root (100%, transparent, overflow:clip)
  └─③ div[data-tauri-drag-region] (flex, padding, perspective)
    └─④ section.zen-panel-enter (w-142, transform-3d, CSS入场)
      └─⑤ motion.div (rotateY + scale 动画, height管理)
        ├─⑥a div.backface-hidden (正面槽, absolute)
        │  └─⑦ GlassCard[cyan]
        │     ├─ 外层div (白色玻璃边框, flex h-full)
        │     └─ main (黑色玻璃内容, grow backdrop-blur)
        │        └─ WorkArea
        │
        ├─⑥b div.backface-hidden (背面槽, rotateY:180deg)
        │  └─⑦ GlassCard[violet]
        │     ├─ 外层div (紫色玻璃边框, flex h-full)
        │     └─ main (黑色玻璃内容, grow backdrop-blur)
        │        └─ SettingsPanel
        │
        └─ HaloSweep (翻转光晕, pointer-events-none)
```

---

## 各层详解

### ① OS 原生窗口 (Tauri Window)

| 属性 | 值 | 说明 |
|------|------|------|
| width | 600 | 固定宽度 |
| height | 280 (初始) | 动态跟踪内容 |
| transparent | true | 窗口背景透明 |
| decorations | false | 无标题栏 |
| shadow | false | 无系统阴影 |
| resizable | false | 不可缩放 |
| visible | false | 启动时隐藏 |

**控制文件**：
- `src-tauri/tauri.conf.json` — 声明初始属性
- `src-tauri/src/lib.rs` — `show_window` 命令（单次 IPC: setSize → center → show → setFocus）
- `src/hooks/useAutoResizeWindow.ts` — 首次用 `show_window`，后续用 `setSize` 调整高度

---

### ② WebView 根节点 `<html>` `<body>` `<div#root>`

```css
html, body, #root {
  width: 100%; height: 100%;
  background: transparent;
  overflow: clip;
}
```

**控制文件**：`index.html` + `src/index.css`

- 三者 100%×100% 充满 OS 窗口
- `background: transparent` 保持透明
- `overflow: clip` 防止 3D 翻转溢出产生滚动条（比 `hidden` 更严格，不创建滚动容器）

---

### ③ 拖拽区域 `<div data-tauri-drag-region>`

```tsx
<div
  data-tauri-drag-region
  className="relative flex min-h-full w-full items-start justify-center
             px-4 pt-4 pb-12 perspective-distant"
>
```

**控制文件**：`src/components/layout/FlipCard.tsx`

| 类名 | 作用 |
|------|------|
| `data-tauri-drag-region` | Tauri 特殊属性，鼠标按住可拖动窗口 |
| `min-h-full w-full` | 铺满 WebView |
| `items-start justify-center` | **顶部居中**（避免翻转时垂直跳跃） |
| `px-4 pt-4 pb-12` | 上 16px、左右 16px、底 48px（给 3D 阴影和 Toast 留空间） |
| `perspective-distant` | TW v4 透视 `perspective: 1200px`，创建 3D 空间 |

---

### ④ 面板入场容器 `<section.zen-panel-enter>`

```tsx
<section
  key={panelAnimateKey}
  ref={panelRef}
  className="zen-panel-enter w-142 transform-3d"
>
```

**控制文件**：`src/components/layout/FlipCard.tsx` + `src/index.css`

- `key={panelAnimateKey}` — 每次唤醒递增，强制 React 重建子树 → 触发 `@starting-style` 入场动画
- `w-142` — 固定宽度 568px（600px 窗口 - 32px 左右 padding）
- `transform-3d` — `transform-style: preserve-3d`
- `zen-panel-enter` — CSS 浏览器原生入场动画（仅 DOM 插入时触发一次）：

```css
.zen-panel-enter {
  opacity: 1; scale: 1;
  transition: opacity 0.18s cubic-bezier(0.22, 1, 0.36, 1),
              scale 0.18s cubic-bezier(0.22, 1, 0.36, 1);
  @starting-style { opacity: 0; scale: 0.97; }
}
```

---

### ⑤ 3D 翻转体 `<motion.div>`

```tsx
<motion.div
  className="relative w-full rounded-3xl transform-3d"
  style={{
    height: targetHeight || "auto",
    willChange: isFlipAnimating ? "transform" : "auto",
  }}
  animate={{ rotateY, scale }}
  transition={{ rotateY: FLIP_ROTATE_TRANSITION, scale: FLIP_SCALE_TRANSITION }}
  onAnimationComplete={handleFlipComplete}
>
```

**控制文件**：`src/components/layout/FlipCard.tsx` + `src/shared/tokens.ts` + `src/shared/motion.ts`

**职责**：
1. 驱动 3D 翻转动画（rotateY 8 帧关键帧 + scale 缩放）
2. 管理容器高度（`height: targetHeight`）
3. `transform-3d` 传递 3D 变换上下文给子元素
4. `rounded-3xl` (24px) 匹配 GlassCard 外层圆角

**高度管理策略**：
- 翻转触发 → `targetHeight = max(frontH, backH)` + 窗口额外加 `FLIP_WINDOW_EXTRA` px
- 翻转完成 → `handleFlipComplete` 清除翻转状态 → ResizeObserver 重新测量自然高度
- 非翻转期 → ResizeObserver 持续监听可见面尺寸变化

---

### ⑥ 正面/背面卡片槽 `<div.backface-hidden>`

```tsx
{/* 正面 */}
<div ref={frontRef}
     className="backface-hidden absolute inset-x-0 top-0 w-full"
     style={{
       pointerEvents: isFlipped ? "none" : "auto",
       ...(isFlipAnimating ? { height: targetHeight } : {}),
     }}>
  {front}  {/* → WorkArea */}
</div>

{/* 背面 */}
<div ref={backRef}
     className="backface-hidden absolute inset-x-0 top-0 w-full"
     style={{
       transform: "rotateY(180deg)",
       pointerEvents: isFlipped ? "auto" : "none",
       ...(isFlipAnimating ? { height: targetHeight } : {}),
     }}>
  {back}   {/* → SettingsPanel */}
</div>
```

**控制文件**：`src/components/layout/FlipCard.tsx`

| 属性 | 作用 |
|------|------|
| `backface-hidden` | rotateY > 90° 时自动隐藏（TW v4 原生类） |
| `absolute inset-x-0 top-0` | 两面重叠在同一位置，从顶部开始 |
| 背面 `rotateY(180deg)` | 预翻转，当父层翻到 180° 时恰好归位 |
| `pointerEvents: "none"` | 不可见面禁止鼠标事件 |
| `height: targetHeight` (翻转中) | **等高策略**：两面拉伸到容器高度，GlassCard 填满，消除空白间隙 |
| `height: undefined` (翻转后) | 恢复自然高度，供 ResizeObserver 精确测量 |

---

### ⑦ 双层毛玻璃卡片 `<GlassCard>`

```tsx
{/* 外层 — "白色玻璃"边框 */}
<div className="flex h-full flex-col rounded-3xl border p-0.5
                border-white/30 bg-white/[0.08]"
     style={{ boxShadow: OUTER_GLOW_CYAN }}>

  {/* 内层 — "黑色玻璃"内容区 */}
  <main className="relative flex grow w-full flex-col overflow-hidden
                   rounded-[21px] border border-white/10 bg-[#0d1117]/90
                   p-5 text-zinc-100 backdrop-blur-2xl"
        style={{ boxShadow: CARD_SHADOW_CYAN }}>
    {children}
  </main>
</div>
```

**控制文件**：`src/components/shared/GlassCard.tsx` + `src/shared/tokens.ts`

| 子层 | 圆角 | 背景 | 边框 | 阴影 | 关键 CSS |
|------|------|------|------|------|----------|
| 外层 | 24px | `white/8%` | `white/30%` | `OUTER_GLOW` | `flex h-full flex-col` |
| 内层 | 21px | `#0d1117/90%` | `white/10%` | `CARD_SHADOW`（含 inset 高光） | `grow backdrop-blur-2xl` |

- 外层 `p-0.5` (2px) + 圆角差 (24-21=3px) → 完美**同心圆角**
- `h-full` — 当父级（face slot）有显式高度时，外层拉伸到该高度
- `grow` — 内层在 flex 列布局中伸展填满，消除视觉空隙
- `accent` 参数切换配色：`"cyan"`（主页面）/ `"violet"`（设置页面）
- 外层 `onMouseDown` → `useDragWindow` 使整张卡片可拖拽

---

## 尺寸传递链

**由内向外驱动**：

```
GlassCard 内容撑开
  → frontRef / backRef .offsetHeight 测量
  → setTargetHeight() 设到第⑤层 motion.div
  → reportContentHeight() 加上 WINDOW_VERTICAL_PADDING (40px)
  → Tauri setSize() 调整第①层 OS 窗口高度
```

**翻转时的等高策略**：

```
翻转触发
  → targetHeight = max(frontH, backH)
  → 第⑥层 face slot: height = targetHeight (显式拉伸)
  → 第⑦层 GlassCard: h-full + grow (填满拉伸空间)
  → 两面视觉等高，无空白间隙

翻转完成
  → 清除 isFlipAnimating
  → 第⑥层 face slot: height = undefined (恢复自然高度)
  → ResizeObserver 测量可见面自然高度
  → targetHeight 收缩到精确值
  → OS 窗口跟随收缩
```
