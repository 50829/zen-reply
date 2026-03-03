# ZenReply 项目开发交接文档

更新时间：2026-03-01  
版本：v0.1.0  
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
| 桌面壳 | **Tauri v2** (Rust) | 窗口管理、全局快捷键、剪贴板、本地存储、系统托盘 |
| 前端 | **React 19** + TypeScript + Vite | UI 与业务逻辑 |
| 样式 | **Tailwind CSS v4** | 原子化样式 |
| 动画 | **Framer Motion** | 入场/翻转/Toast 动画 |
| 图标 | **Lucide React** | 清除按钮等 UI 图标 |
| 模型 | **前端直连** OpenAI 兼容 chat/completions (SSE) | `useLlmStream.ts` 负责 |
| 键模拟 | **enigo 0.2** | 模拟 Ctrl+C 捕获选区 |
| 包管理 | **pnpm** (JS) / **Cargo** (Rust) | |

---

## 3. 目录结构与职责

```
src/
  App.tsx                          <- 组合根：Context 注入，条件渲染 FlipCard + ZenToast
  AppShortcuts.tsx                 <- 全局键盘快捷键分发（独立组件，由 AppInner 渲染）
  main.tsx                         <- ReactDOM 入口，StrictMode
  index.css                        <- Tailwind import + 全局样式 + scrollbar + 翻转卡背面可见性

  components/
    layout/FlipCard.tsx            <- 3D 翻转容器 (前=WorkArea, 后=SettingsPanel)
    zenreply/WorkArea.tsx          <- 主面板：原始文本 + 角色选择 + 结果区
    zenreply/SourceTextCard.tsx    <- INPUT->textarea / 其他->只读 <p>
    zenreply/RoleComposer.tsx      <- 角色按钮 + 自定义编辑 + 上下文 + 生成按钮
    zenreply/ResultCard.tsx        <- 流式结果 + 确认/取消
    settings/SettingsPanel.tsx     <- API Key / Base / Model 编辑 + 保存/测试
    feedback/ZenToast.tsx          <- 统一居中 Toast（success/error/info）
    shared/ClearableField.tsx      <- 带清除按钮的输入框组件
    shared/GlassCard.tsx           <- 毛玻璃卡片容器

  contexts/
    AppProvider.tsx                <- 组合所有 Context Provider
    SettingsContext.tsx            <- 设置状态上下文
    ToastContext.tsx               <- Toast 状态上下文
    ZenReplyContext.tsx            <- 主流程状态上下文

  hooks/
    useZenReplyFlow.ts             <- 核心状态机 (INPUT->GENERATING->FINISHED)
    useSettings.ts                 <- 设置读写 + 测试连接
    useToast.ts                    <- Toast 状态 + 自动消隐 + onDismiss 回调
    useLlmStream.ts                <- fetch SSE + 错误映射 + 超时 + abort
    useGlobalShortcuts.ts          <- 全局键盘分发 (Esc/Enter/1-4/Ctrl+,/Ctrl+S)
    useAutoResizeWindow.ts         <- ResizeObserver -> show_window 自适应窗口高度

  features/
    settings/store.ts              <- plugin-store 读写 + 标准化
    zenreply/types.ts              <- Stage / TargetRole / RoleOption 类型
    zenreply/prompt.ts             <- Prompt 拼装逻辑

  shared/
    constants.ts                   <- DEFAULT_API_BASE, DEFAULT_MODEL_NAME, ROLE_OPTIONS
    utils.ts                       <- normalizeValue, toErrorMessage
    motion.ts                      <- 共享动画参数
    tokens.ts                      <- 设计 token（颜色等）

src-tauri/
  src/lib.rs                       <- Rust 入口：快捷键注册、选区捕获、窗口管理、系统托盘、API 测试
  tauri.conf.json                  <- 窗口配置（visible:false, transparent:true, decorations:false）
  capabilities/default.json        <- 权限声明
```

---

## 4. 当前已实现功能

### 正常工作

| 功能 | 实现位置 |
|---|---|
| AI 流式生成 | `useLlmStream.ts` -> fetch SSE |
| 多角色切换 (老板/甲方/绿茶/自定义) | `RoleComposer.tsx` + `useZenReplyFlow.ts` |
| 自定义角色编辑 | `RoleComposer` inline input + `confirmCustomRole` |
| 设置持久化 (API Key/Base/Model) | `store.ts` -> plugin-store |
| 3D 翻转设置面板 | `FlipCard.tsx` (preserve-3d + backface-visibility) |
| 统一 Toast (success/error/info) | `useToast.ts` + `ZenToast.tsx` |
| 错误自动消隐 + 按钮禁用联动 | `hasBlockingError` + `clearBlockingErrorRef` bridge |
| 窗口自适应高度 | `useAutoResizeWindow.ts` (ResizeObserver -> show_window IPC) |
| 键盘快捷键全覆盖 | `AppShortcuts.tsx` + `useGlobalShortcuts.ts` |
| 确认后自动复制 + 延迟关窗 | `confirmAndCopy` -> writeText -> 800ms hide |
| 系统托盘常驻 | `lib.rs` TrayIconBuilder + 托盘菜单（打开/设置/退出）|
| 窗口关闭隐藏到托盘 | `on_window_event` CloseRequested -> prevent_close + hide |
| 托盘菜单动态更新 | `update_tray_menu` 根据面板可见性切换菜单项 |
| show_window 合并 IPC | `show_window` 命令：resize+center+show+focus 单次调用 |
| 选区捕获异步化 | `on_shortcut_pressed` 在独立线程执行，不阻塞事件循环 |
| 兜底异步捕获 | `fallback_capture` 轮询适配慢速应用（如 Electron）|

---

## 5. 关键架构说明

### 5.1 启动时序（关键路径）

```
Alt+Space Released
  |
  +-- 独立线程启动
        |
        ├── 1. 读取剪贴板（记录 previous）
        ├── 2. sleep 30ms（等待 OS 处理按键释放）
        ├── 3. enigo Ctrl+C（模拟复制）
        ├── 4. sleep 50ms（等待源应用处理复制）
        ├── 5. 读取剪贴板 -> 对比 previous，得到 text（约 87ms）
        |
        ├── 6. emit("zenreply://clipboard-text", { text })
        |      前端收到后：onWake(text) -> 状态重置 + 文本填入
        |      前端在 useAutoResizeWindow 测量完成后调用 show_window
        |
        └── 7. if text.is_empty():
                 fallback_capture（再次 Ctrl+C + 轮询 10 次，间隔 30ms）
                 emit("zenreply://clipboard-captured", { text })
                 前端收到后：仅 setRawText(text)，不重置 UI
```

> **关键约束**：enigo Ctrl+C 必须在 `window.show()` 之前执行。show_window 由前端在测量窗口尺寸后主动调用，而非 Rust 触发。

### 5.2 Context 架构

`AppProvider` 组合三个 Context：
- `ToastContext`：Toast 显示
- `SettingsContext`：设置状态（`useSettings`）
- `ZenReplyContext`：主流程状态（`useZenReplyFlow`）

`App.tsx` 只渲染 `AppProvider > AppInner`，`AppInner` 消费 Context，`AppShortcuts` 作为独立组件处理键盘事件。

### 5.3 Tauri 事件/命令清单

| 名称 | 方向 | 触发时机 |
|---|---|---|
| `zenreply://clipboard-text` | Rust -> React | 快捷键触发，携带捕获到的文本 |
| `zenreply://clipboard-captured` | Rust -> React | 兜底捕获成功，仅补填文本 |
| `zenreply://tray-wake` | Rust -> React | 托盘「打开主面板」点击 |
| `zenreply://tray-open-settings` | Rust -> React | 托盘「打开设置」点击 |
| `hide_window` | React -> Rust | 会话结束/Esc |
| `show_window(w, h)` | React -> Rust | 内容测量完成后唤醒面板 |
| `test_api_connection` | React -> Rust | 设置面板点击「测试连接」|

---

## 6. 开发规范
1. 核心哲学：架构主导角色定位：人类 = 架构师（定义边界、抽象模型）；AI = 执行官（编写实现、补全测试）。资产观：代码是可再生的“草稿”，清晰的结构和解耦的边界才是核心资产。首要原则：控制复杂度 > 增加功能。清晰比聪明更重要。

2. 任务分级与执行流 (解决“慢”的问题)根据任务复杂度，自动切换执行模式：

- 模式 A：轻微改动 (UI微调/小Bug/单文件逻辑)触发条件：预计影响 < 3 个文件。流程：AI 在对话中直接口述：[修改文件清单]、[修改原因]、[风险评估]。并直接开始修改给出预期结果与风险提示。无需 更新 MANIFEST.md 或创建 devlog。

- 模式 B：结构化任务 (新功能/跨模块重构/API变动)触发条件：涉及新文件、修改 > 3 个文件、或涉及核心 Data Model。流程：登记：在 devlog/MANIFEST.md 记录任务状态（Research）。计划：AI 输出一份简短的 修改计划（分阶段步骤）。重大改动时按当天日期+序号创建任务文档（如 `0301_01.md`），包含：问题现状、底层原因分析、预期改动点。确认：人类确认后，状态改为 In Progress。实施：按阶段提交，确保每步 CI 全绿。

3. AI 行为准则 (硬约束)最小改动原则：禁止为了“风格统一”而进行无意义的大面积重写。优先复用现有函数。目录保护：禁止私自创建、移动、重命名目录。修改前必读：AI 在修改任何代码前，必须先搜索并阅读相关联的 .interface 或类型定义文件。禁止“先并后修”：main 分支必须始终处于 Build-ready 状态。

4. 自动化与质量门禁分支策略：禁止在 main 提交。使用 feature/<desc> 分支。合并前检查CI 强制项：lint + type-check + test + build。任一失败禁止合并。Commit 规范：使用 Conventional Commits (e.g., feat:, fix:)。一事一议，严禁一个 Commit 混合多个功能的修改。

5. 技术债红线类别处理态度：可容忍暂不处理局部代码重复、非核心命名不完美、TODO 注释。需警惕专项清理模块间隐式耦合、过大的函数、逻辑分散。禁止出现立即停工重构数据模型定义冲突、核心业务语义歧义、破坏性的 API 变更。

6. 实时文档对齐：涉及第三方库（如 Next.js, Tailwind, Supabase 等）的 API 调用时，必须 先通过 context7 检索该库的最新版本文档，严禁凭旧记忆生成代码。

<!-- ## 6. 多 AI 并行任务规范 （过于复杂，已废弃）

### 工作流

- **任务启动**：修改任何代码前，先检查 `devlog/MANIFEST.md`。重大改动时按当天日期+序号创建任务文档（如 `0301_01.md`），包含：问题现状、底层原因分析、预期改动点。

- **登记**：在 `MANIFEST.md` 中新增行，状态设为 `Research`，标明 Scope（文件锁定范围）。

- **方案确认**：等用户确认后，将状态改为 `In Progress` 再开始改代码。

- **冲突检查**：改代码前检查所有 `In Progress` 任务的 Scope。若有文件冲突，设为 `Pending` 并告知用户。

- **完成**：代码改完后，在任务文档中记录【实际改动记录】及【潜在风险】。用户审核后标记 Done，测试通过后归档至 `devlog/archive/`，清理 `MANIFEST.md`。

--- -->

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
| 生成按钮无响应 | ① `hasBlockingError` 为 true -> 等待 Toast 消隐；② `api_key` 为空 -> 打开设置填写 |
| 模型返回乱码/空 | ① `api_base` 与服务商不匹配；② `model_name` 拼写错误 |
| 测试连接失败 | ① 网络连通性；② 401=Key 无效；③ 402=余额不足 |
| 窗口尺寸异常 | ① `useAutoResizeWindow` 的 `panelRef` 是否正确绑定；② 内容 overflow |
| Toast 消隐后按钮仍禁用 | `clearBlockingErrorRef` bridge 未正确连接 `useToast.onDismiss` -> `clearError` |
| 快捷键唤醒后文本为空 | ① 源应用不支持 Ctrl+C；② 兜底捕获可能需要 300ms，稍等后文本会自动填入 |
| 窗口关闭后退出了 | `on_window_event CloseRequested` 未正确注册，或 prevent_close 未调用 |