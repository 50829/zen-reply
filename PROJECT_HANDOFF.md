# ZenReply 项目开发交接文档

更新时间：2026-02-27  
适用对象：下一窗口/下一位协作者快速接手开发与发布

---

## 1. 项目愿景

一款基于 **Tauri v2** 开发的桌面端 AI 辅助工具。解决用户在社交/职场中的沟通焦虑——通过「一键发泄 + AI 转换」交互，将直白的情绪话语即时转写为体面高情商的专业回复。

**核心交互流（5 步闭环）：**

1. **触发** — 用户在微信/飞书等应用中选中文字，按 `Alt+Space`。
2. **唤醒** — Rust 捕获选区文本 → 弹出居中的透明毛玻璃面板，文本自动填入。
3. **补充** — 面板提供预设身份标签（老板/甲方/绿茶）+ 自定义对象 + 可选上下文输入。
4. **生成** — 前端调用 OpenAI 兼容 API 流式生成高情商回复。
5. **注入** — 用户按 `Enter` 确认，回复自动写入剪贴板，窗口消失。用户 `Ctrl+V` 发送。

---

## 2. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面壳 | **Tauri v2** (Rust) | 窗口管理、全局快捷键、剪贴板、本地存储 |
| 前端 | **React 19** + TypeScript + Vite | UI 与业务逻辑 |
| 样式 | **Tailwind CSS v4** | 原子化样式 |
| 动画 | **Framer Motion** | 入场/翻转/Toast 动画 |
| 图标 | **Lucide React** | 清除按钮等 UI 图标 |
| 模型 | **前端直连** OpenAI 兼容 chat/completions (SSE) | `useLlmStream.ts` 负责 |
| 键模拟 | **enigo 0.2** | 模拟 Ctrl+C 捕获选区 |
| 包管理 | **Bun** (JS) / **Cargo** (Rust) | |

---

## 3. 目录结构与职责

```
src/
  App.tsx                          ← 组合根：连接 hooks，渲染 FlipCard + ZenToast
  main.tsx                         ← ReactDOM 入口，StrictMode
  index.css                        ← Tailwind import + 全局样式 + scrollbar + 翻转卡背面可见性

  components/
    layout/FlipCard.tsx            ← 3D 翻转容器 (前=WorkArea, 后=SettingsPanel)
    zenreply/WorkArea.tsx          ← 主面板：原始文本 + 角色选择 + 结果区
    zenreply/SourceTextCard.tsx    ← INPUT→textarea / 其他→只读 <p>
    zenreply/RoleComposer.tsx      ← 角色按钮 + 自定义编辑 + 上下文 + 生成按钮
    zenreply/ResultCard.tsx        ← 流式结果 + 确认/取消
    settings/SettingsPanel.tsx     ← API Key / Base / Model 编辑 + 保存/测试
    feedback/ZenToast.tsx          ← 统一居中 Toast（success/error/info）

  hooks/
    useZenReplyFlow.ts             ← 核心状态机 (INPUT→GENERATING→FINISHED)
    useSettings.ts                 ← 设置读写 + 测试连接
    useToast.ts                    ← Toast 状态 + 自动消隐 + onDismiss 回调
    useLlmStream.ts                ← fetch SSE + 错误映射 + 超时 + abort
    useGlobalShortcuts.ts          ← 全局键盘分发 (Esc/Enter/1-4/Ctrl+,/Ctrl+S)
    useAutoResizeWindow.ts         ← ResizeObserver → setSize 自适应窗口高度

  features/
    settings/store.ts              ← plugin-store 读写 + 标准化
    zenreply/types.ts              ← Stage / TargetRole / RoleOption 类型
    zenreply/prompt.ts             ← Prompt 拼装逻辑

  shared/
    constants.ts                   ← DEFAULT_API_BASE, DEFAULT_MODEL_NAME
    utils.ts                       ← normalizeValue, toErrorMessage

src-tauri/
  src/lib.rs                       ← Rust 入口：快捷键注册、选区捕获、窗口管理、API 测试
  tauri.conf.json                  ← 窗口配置（visible:false, transparent:true, decorations:false）
  capabilities/default.json        ← 权限声明
```

---

## 4. 当前已实现功能

### ✅ 正常工作

| 功能 | 实现位置 |
|---|---|
| AI 流式生成 | `useLlmStream.ts` → fetch SSE |
| 多角色切换 (老板/甲方/绿茶/自定义) | `RoleComposer.tsx` + `useZenReplyFlow.ts` |
| 自定义角色编辑 | `RoleComposer` inline input + `confirmCustomRole` |
| 设置持久化 (API Key/Base/Model) | `store.ts` → plugin-store |
| 3D 翻转设置面板 | `FlipCard.tsx` (preserve-3d + backface-visibility) |
| 统一 Toast (success/error/info) | `useToast.ts` + `ZenToast.tsx` |
| 错误自动消隐 + 按钮禁用联动 | `hasBlockingError` + `clearBlockingErrorRef` bridge |
| 窗口自适应高度 | `useAutoResizeWindow.ts` (ResizeObserver) |
| 键盘快捷键全覆盖 | `useGlobalShortcuts.ts` |
| 确认后自动复制 + 延迟关窗 | `confirmAndCopy` → writeText → 800ms hide |

### ❌ 当前存在严重 Bug（P0）

#### Bug 1：窗口动画闪烁（双重动画）

**现象：** Alt+Space 后黑色面板立即出现 → 短暂闪烁消失 → 从底部滑入一个新面板。

**根因链路：**

```
window.show()
  → 窗口可见，React 已渲染 FlipCard key=0 (initial={false}，全透明度静态呈现)
  → 用户看到完整面板（第一帧）

emit(CLIPBOARD_EVENT)
  → JS 事件循环处理 → onWake() → setPanelAnimateKey(0 → 1)
  → React 销毁 key=0 的 motion.section，挂载 key=1
  → key=1 的 initial={{ y:20, opacity:0, scale:0.95 }} → animate 入场
  → 用户看到面板消失后从底部滑入（第二帧起）
```

**核心矛盾：** `panelAnimateKey` 递增导致 FlipCard **卸载+重建**。`window.show()` 和 `emit()` 之间存在至少 1 帧间隙，key=0 的面板在这一帧内可见。

#### Bug 2：选区文本未被捕获（剪贴板逻辑破坏）

**现象：** 选中文本按 Alt+Space 后，原始文本显示的是剪贴板旧内容而非选区内容。

**根因链路：**

```
on_shortcut_pressed (当前错误的异步方案):
  window.show()           ← ZenReply 获得焦点 ⚠️
  window.set_focus()      ← 源应用（微信/飞书）失去焦点 ⚠️
  emit(CLIPBOARD_EVENT, "")

  thread::spawn → capture_selected_text:
    trigger_copy_shortcut()   ← enigo 发送 Ctrl+C
                              ← 但此时焦点在 ZenReply！
                              ← Ctrl+C 作用于 ZenReply 窗口，不是源应用
    clipboard.read()          ← 读到的是旧剪贴板内容
    emit(CLIPBOARD_CAPTURED)  ← 发送旧内容
```

**核心矛盾：** 模拟按键式剪贴板捕获（enigo Ctrl+C）依赖 **源应用持有焦点**。`window.show()` + `set_focus()` 在捕获**之前**抢走了焦点，导致 Ctrl+C 发送到了错误的窗口。这是**架构级缺陷**——异步捕获方案从根本上不可行。

---

## 5. 启动流程根因分析与修复方案

### 5.1 不可违反的物理约束

| 约束 | 原因 |
|---|---|
| **Ctrl+C 必须在 `window.show()` 之前执行** | enigo 模拟按键作用于当前焦点窗口。show+focus 后焦点不在源应用。 |
| **`window.show()` 之前不应有 React 可见内容** | 否则用户会看到"旧帧"闪烁。 |
| **捕获延迟应尽量短** | 用户可感知的延迟阈值约 100-150ms。 |

### 5.2 推荐方案：同步快速捕获 + 条件渲染 + 异步兜底

#### Phase A — Rust：优化 `on_shortcut_pressed`

**策略：先捕获，再显示。用快速同步路径覆盖 90%+ 的场景，异步兜底覆盖慢速应用。**

```
on_shortcut_pressed(app):
  ┌─ 同步快速路径（~90ms）─────────────────────────────────┐
  │ 1. previous = clipboard.read()              // ~1ms    │
  │ 2. sleep(30ms)              // 等待 Alt+Space 完全释放 │
  │ 3. trigger_copy_shortcut()  // enigo Ctrl+C   ~5ms     │
  │ 4. sleep(50ms)              // 等待源应用处理复制       │
  │ 5. current = clipboard.read()               // ~1ms    │
  │ 6. text = (current != previous) ? current : ""         │
  └────────────────────────────────────────────────────────┘
  7. window.show() + set_focus()
  8. emit("zenreply://clipboard-text", { text })

  ┌─ 异步兜底（仅当 text 为空时）──────────────────────────┐
  │ thread::spawn:                                         │
  │   for _ in 0..10:                                      │
  │     sleep(30ms)                                        │
  │     t = clipboard.read()                               │
  │     if t != previous && !t.is_empty():                 │
  │       emit("zenreply://clipboard-captured", { t })     │
  │       return                                           │
  └────────────────────────────────────────────────────────┘
```

**对比旧代码（改动前的原版）：**
- 旧同步捕获：80 + 12×35 = **500ms 最佳**，80 + 12×35 + 8×35 = **780ms 最差**
- 新同步路径：30 + 50 = **~87ms 固定**
- 用户感知：几乎即时弹窗，提速 5-8 倍

**注意：** `ShortcutState::Released` 已确保 Alt+Space 物理释放，30ms 只是给 OS 留的缓冲余量，可根据实测适当调整。

#### Phase B — React：条件渲染消除双重动画

**策略：引入 `isAwake` 状态，FlipCard 仅在唤醒后才挂载，杜绝 key=0 闪帧。**

```tsx
// useZenReplyFlow.ts
const [isAwake, setIsAwake] = useState(false);

// onWake:
setIsAwake(true);
setPanelAnimateKey(prev => prev + 1);

// resetFlow (hide 时调用):
setIsAwake(false);

// App.tsx render:
{isAwake ? (
  <FlipCard
    panelAnimateKey={panelAnimateKey}
    initial={{ y: 20, opacity: 0, scale: 0.95 }}   // 始终从动画起点开始
    ...
  />
) : null}
```

**为什么这能解决双重动画：**

| 时序 | 旧行为 | 新行为 |
|---|---|---|
| `window.show()` | key=0 面板可见（闪帧） | `isAwake=false` → 无内容渲染 → 透明窗口 |
| `onWake()` | key 递增 → 卸载旧 + 挂载新 = 双重动画 | `isAwake=true` → FlipCard **首次挂载** → 单次入场动画 |
| 后续唤醒 | 同样双重动画 | `resetFlow` 设 `isAwake=false`（窗口已隐藏时卸载，不可见）→ 唤醒时全新挂载 |

**FlipCard `initial` 可恢复为固定值**（不再需要 `panelAnimateKey === 0 ? false : ...` 的 hack）。

#### Phase C — 前端：双事件监听（已实现，保留）

| 事件 | 触发时机 | 前端处理 |
|---|---|---|
| `zenreply://clipboard-text` | Rust 同步路径后立即发送 | `onWake(text)` — 重置 UI + 填入文本 |
| `zenreply://clipboard-captured` | 异步兜底成功时发送 | `setRawText(text)` — 仅更新文本，不重置 UI |

### 5.3 方案优势总结

| 维度 | 改进 |
|---|---|
| 启动速度 | 500-780ms → ~87ms（快 5-8 倍） |
| 动画正确性 | 双重动画 → 单次平滑入场 |
| 选区捕获 | 焦点被抢走导致失败 → 捕获在 show 之前完成 |
| 代码复杂度 | 删除 `panelAnimateKey === 0` hack，引入语义清晰的 `isAwake` |
| 兼容性 | 异步兜底覆盖剪贴板更新慢的应用 |

---

## 6. 下一步实施清单（按序执行）

### Step 1：修复 Rust `on_shortcut_pressed`（关键路径）

**文件：** `src-tauri/src/lib.rs`

1. 重写 `on_shortcut_pressed`：先快速同步捕获（30ms sleep → Ctrl+C → 50ms sleep → 读取），再 `window.show()`
2. 仅当快速路径未获取到文本（`text.is_empty()`）时，才启动异步兜底线程
3. 可精简或重写 `capture_selected_text` 函数，移除旧的 12+8 次轮询逻辑

### Step 2：前端引入 `isAwake` 条件渲染（消除双重动画）

**文件：** `src/hooks/useZenReplyFlow.ts` → `src/App.tsx` → `src/components/layout/FlipCard.tsx`

1. `useZenReplyFlow` 新增 `isAwake` state，初始 `false`
2. `onWake` 设 `isAwake = true`
3. `resetFlow` 设 `isAwake = false`
4. `App.tsx` 中 `{isAwake ? <FlipCard .../> : null}`
5. `FlipCard` 移除 `panelAnimateKey === 0 ? false : ...` hack，`initial` 恢复为固定动画起点
6. `useZenReplyFlow` return 中暴露 `isAwake`

### Step 3：验证与回归

1. `tsc --noEmit` — TypeScript 零错误
2. `cargo check` — Rust 零错误
3. 手动测试矩阵：
   - [ ] 微信：选中文本 → Alt+Space → 面板显示选中文本
   - [ ] 飞书/浏览器：同上
   - [ ] 未选中文本 → Alt+Space → textarea 为空
   - [ ] 连续操作：Alt+Space → Esc → Alt+Space → 无闪烁，单次动画
   - [ ] 设置面板翻转正常
   - [ ] AI 生成 → 确认 → 复制 → 关窗 全流程正常

### Step 4：工程化补齐（发布前）

| 项 | 说明 |
|---|---|
| 品牌统一 | `tauri.conf.json` → `productName: "ZenReply"`, `identifier: "com.zenreply.app"` |
| CSP 收敛 | `"csp": null` → 配置实际允许的域（至少允许 API base URL） |
| Lint 脚本 | `package.json` 增加 `lint` / `typecheck` 脚本 |
| CI | 最小 GitHub Actions：typecheck + cargo check + build |
| 测试 | `tests/` 目录，先覆盖 `prompt.ts` + `utils.ts` + 错误映射 |

---

## 7. 键盘操作速查

| 快捷键 | 场景 | 行为 |
|---|---|---|
| `Alt+Space` | 任意应用 | 捕获选区 + 唤醒面板 |
| `1` / `2` / `3` | INPUT 非输入框 | 选择 老板/甲方/绿茶 |
| `4` | INPUT 非输入框 | 进入自定义对象编辑 |
| `Enter` | INPUT 非输入框 | 开始生成 |
| `Enter` | FINISHED 非输入框 | 确认并复制 |
| `Esc` | 设置面板打开 | 关闭设置 |
| `Esc` | 其他 | 终止会话（隐藏窗口） |
| `Ctrl/Cmd + ,` | 任意 | 切换设置面板 |
| `Ctrl/Cmd + S` | 设置面板 | 保存设置 |

---

## 8. 快速排障

| 现象 | 检查点 |
|---|---|
| 生成按钮无响应 | ① `hasBlockingError` 为 true → 等待 Toast 消隐；② `api_key` 为空 → 打开设置填写 |
| 模型返回乱码/空 | ① `api_base` 与服务商不匹配；② `model_name` 拼写错误 |
| 测试连接失败 | ① 网络连通性；② 401=Key 无效；③ 402=余额不足 |
| 窗口尺寸异常 | ① `useAutoResizeWindow` 的 `panelRef` 是否正确绑定；② 内容 overflow |
| Toast 消隐后按钮仍禁用 | `clearBlockingErrorRef` bridge 未正确连接 `useToast.onDismiss` → `clearError` |

---

## 9. 结论

项目核心功能闭环完整（唤醒 → 生成 → 复制 → 收口），UI 质量较高。**当前唯一阻塞项**是启动流程的两个 P0 Bug（双重动画 + 选区捕获失效），根因已明确，修复方案已设计完成（§5），需按 §6 的 Step 1-3 依次落地。

