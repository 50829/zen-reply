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

## 5. 多AI并行任务规范
- 任务启动： 在修改任何代码前，AI 必须先检查 devlog/MANIFEST.md。如果该文件内没有当前任务，AI 需根据用户当前需求与当天日期，在该/devlog中创建一个任务描述，按日期_序号.md命名，同一日期下文件命名方式按文件存在的顺序记录，如0228_01.md、0228_02.md等。包含：【问题现状】、【底层原因分析】、【预期的改动点】。若该文件有实际内容，AI 需先对内容进行分析，确认是否与用户当前需求相关，若相关则继续在该文件中更新任务描述，若不相关则需要用户确认是否开启一个新任务。

- 调研完成后，在MANIFEST.md中登记该任务，设置状态为Research，标明ID、Scope（文件锁定范围）和Owner（负责该任务的AI）。Scope应尽可能精确，覆盖所有相关改动但不宜过大，以减少与其他任务的冲突。登记后保存后再开始改动，保证其他AI可读到文件锁定信息。

- 方案确认： AI 必须等待用户对 devlog/MMDD_Number.md 中的方案回复“确认”或进行修改后，方可开始修改代码。并在用户确认后，将该任务在 devlog/MANIFEST.md 中的状态从Research转为 In progress，标明 ID、Scope（文件锁定范围）和 Owner（负责该任务的 AI）。Scope 应尽可能精确，覆盖所有相关改动但不宜过大，以减少与其他任务的冲突。标记后保存后再开始改动，保证其他AI可读到文件锁定信息。

- 实施与记录：修改代码前，AI应先阅读devlog/MANIFEST.md中所有In progress条目中的锁定文件。若当前任务的scope与In progress条目中有锁冲突，则将任务设置为Pending，告诉用户有编辑冲突，并不修改任何文件。代码修改完成后，AI 需记录【实际改动记录】及【潜在风险】在/MMDD_Number.md中。用户手动审核代码，并把任务状态标记为done。

- 归档： 一个任务彻底测试通过后，由用户将该文档内容移动至 devlog/archive/ 文件夹下，以日期_序号命名（如0228_01.md），描述你干了什么，并清理MANIFEST.md中相应条目。一个问题单开一个文件，同一日期下文件命名方式按文件存在的顺序记录，如0228_01.md、0228_02.md等。


AI 并行开发规范 (Multi-Agent Protocol)

Step 1: 冲突检查 (Pre-flight Check)
在执行任何修改前，必须读取 devlog/MANIFEST.md。
检查 Active Tasks 中是否有任务锁定（Locks）了你计划修改的文件。
如果有冲突，停止操作并告知用户：“文件 [文件名] 正被任务 [ID] 锁定，请等待或手动调整优先级。”

Step 2: 任务登记 (Registration)
如果无冲突，在 Active Tasks 表格中新增一行，填写 ID、Scope 和你的 Owner 名称。

Step 3: 创建日志 (Task Logging)
在 devlog/ 下创建具体的任务文档（如 0228_01_Name.md），详细描述问题及方案。

Step 4: 完成与解锁 (Release)
任务完成后：
将详细任务文档移动至 devlog/archive/。
在 MANIFEST.md 中将该任务状态改为 ✅ Done。
清除该任务占用的 Scope Locks。

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

