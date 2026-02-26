# ZenReply

ZenReply 是一个基于 **Tauri v2 + React** 的桌面端 AI 沟通辅助工具。  
它的目标是把用户在社交/职场中的情绪化草稿，快速转换为体面、自然、可直接发送的高情商回复。

演示场景请看：[评委演示版](./README_DEMO.md)。

## 项目定位

- 触发快：全局快捷键唤醒，无需切应用。
- 隐私优先：确认后仅写入剪贴板，不强制代发。
- 交互顺：流式生成、键盘优先、可随时终止会话。
- 可扩展：OpenAI 兼容 API，已支持 SiliconFlow。

## 核心功能

- 全局快捷键 `Alt+Space` 唤醒面板。
- 自动捕获选中文本（按下快捷键后自动尝试复制选区）。
- 角色化润色：预设对象（老板、甲方、绿茶）+ 自定义对象（`4. ➕自定义` 原位输入并立即生成）。
- 流式输出：真实后端 SSE 流式（非假延迟），逐段渲染，首段自动去除多余前导换行。
- 会话控制：`Esc` 任意阶段终止会话并关闭窗口，支持中断当前流并取消后端请求。
- 结果闭环：`↵ 确认并复制` 写入系统剪贴板，成功后提示 toast 并自动关闭窗口。

## 当前交互流程

1. 在微信/飞书等输入框选中文本。
2. 按 `Alt+Space`，ZenReply 弹窗并展示“原始文本”。
3. 选择沟通对象（`1/2/3`）或按 `4` 输入自定义对象。
4. 填写可选背景后按 `Enter` 或点击“生成回复”。
5. 结果流式生成完成后，按 `Enter` 或点击“确认并复制”。
6. 窗口自动关闭，回到聊天框 `Ctrl+V` 粘贴发送。

## 技术栈

- 桌面框架：Tauri v2（Rust）
- 前端：React + TypeScript + Vite
- 样式：Tailwind CSS v4
- 动画：Framer Motion
- 系统能力：`tauri-plugin-global-shortcut`、`tauri-plugin-clipboard-manager`
- 模型调用：OpenAI 兼容 `chat/completions` 流式接口（SSE）

## Prompt 策略（已实现）

- 对象策略：
- 上位关系：恭敬但有底线（太极拳）。
- 平级/复杂对象：体面但有防御性（软钉子）。
- 亲密关系：高情商且边界清晰。
- 输出约束：仅输出可直接发送正文；禁止解释、标题、编号、AI 腔、额外换行。
- 自定义对象：自动推断身份语境并套用策略。

## 目录结构（核心）

- `src/App.tsx`：主界面与状态机、快捷键行为、生成流程。
- `src/hooks/useLlmStream.ts`：前端流式事件监听、请求发起、取消逻辑。
- `src/features/zenreply/prompt.ts`：Prompt 构建策略。
- `src/features/zenreply/types.ts`：角色、阶段等类型定义。
- `src-tauri/src/lib.rs`：全局快捷键、选区捕获、SSE 调用、流式事件推送、取消命令。
- `src-tauri/capabilities/default.json`：权限声明（含剪贴板读写）。

## 环境要求

- Node.js 18+
- Bun 1.0+
- Rust 稳定版
- Windows/macOS（当前主要在 Windows 场景开发验证）

## 快速开始

1. 安装依赖

```bash
bun install
```

2. 配置环境变量

在项目根目录创建 `.env`（仓库已提供模板）：

```env
ZENREPLY_API_KEY=你的API_KEY
ZENREPLY_API_BASE=https://api.siliconflow.cn/v1
ZENREPLY_MODEL=deepseek-ai/DeepSeek-V3
```

说明：

- `.env` 已被 `.gitignore` 忽略，不会被提交。
- Rust 端通过 `dotenvy` 自动加载 `.env`。
- 也可切换任意 OpenAI 兼容服务（只需改 `API_BASE` 和 `MODEL`）。

3. 启动开发

```bash
bun run tauri dev
```

4. 构建前端

```bash
bun run build
```

## 快捷键与操作

- `Alt+Space`：唤醒并捕获当前选中文本。
- `1/2/3`：选择预设对象。
- `4`：进入“自定义对象”输入模式。
- 自定义输入框中 `Enter`：确认对象并立即开始生成。
- 自定义输入框中 `Esc`：退出输入模式。
- 全局 `Esc`：终止会话并关闭窗口。
- `Enter`：`INPUT` 阶段触发生成，`FINISHED` 阶段确认并复制。

## 流式与中断机制

- 前端每次生成会创建唯一 `requestId`。
- 后端 SSE 按 `requestId` 推送 `delta/done/error` 事件。
- 开始新请求或手动终止时，前端会调用取消命令。
- 后端在多个阶段检查取消标记并尽快停止流。

## 常见问题

- 问：按 `Alt+Space` 后不是最新选中文本？
- 答：请确认当前输入框支持复制快捷键；ZenReply 会自动重试一次复制捕获。

- 问：复制后窗口没关闭？
- 答：当前版本会优先走 Rust `hide_window`，前端隐藏作为兜底；`Esc` 也可强制终止会话。

- 问：结果开头出现多余空行？
- 答：已在流式首段做前导换行清理。

- 问：如何切换模型服务？
- 答：修改 `.env` 的 `ZENREPLY_API_BASE` 与 `ZENREPLY_MODEL` 即可。

## 后续计划

- 接入多 Provider 预设（SiliconFlow、OpenAI、DeepSeek、智谱）。
- 增加可视化 Prompt 调参面板。
- 加入回复历史与一键二次润色。
