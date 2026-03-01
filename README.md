# ZenReply

> 版本 v0.1.0 · Windows

ZenReply 是一个基于 **Tauri v2 + React** 的桌面端 AI 沟通辅助工具。  
它的目标是把用户在社交/职场中的情绪化草稿，快速转换为体面、自然、可直接发送的高情商回复。

## 项目定位

- **触发快**：全局快捷键 `Alt+Space` 唤醒，无需切换应用。
- **隐私优先**：确认后仅写入剪贴板，不强制代发。
- **交互顺**：流式生成、键盘优先、可随时终止会话。
- **可扩展**：OpenAI 兼容 API，默认接 SiliconFlow，任意服务均可配置。

## 核心功能

- 全局快捷键 `Alt+Space` 唤醒面板，自动捕获当前选中文本。
- 角色化润色：预设对象（老板 / 甲方 / 绿茶）+ 自定义对象（原位输入，自动推断权力关系与语气边界）。
- 流式输出：前端直连 OpenAI 兼容 SSE 接口，逐段渲染，自动清理首段多余换行。
- **系统托盘常驻**：关闭窗口后隐藏到托盘，左键单击或菜单随时唤醒；菜单支持直接打开设置 / 退出程序。
- 会话控制：`Esc` 任意阶段终止会话并隐藏窗口，支持中断正在进行的流请求。
- 结果闭环：确认后写入系统剪贴板，Toast 提示成功后窗口自动消失。
- 设置持久化：API Key / Base URL / 模型名称本地存储（`tauri-plugin-store`），3D 翻转面板编辑。

## 交互流程

1. 在微信/飞书等应用中选中文字。
2. 按 `Alt+Space`，ZenReply 面板弹出并自动填入选中文本。
3. 选择沟通对象（键盘 `1/2/3`）或按 `4` 输入自定义对象身份。
4. 可选填写对方刚才说的话作为背景，按 `Enter` 或点击「生成回复」。
5. 流式生成完成后，按 `Enter` 或点击「确认并复制」。
6. 窗口自动消失，切回聊天框 `Ctrl+V` 粘贴发送。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri v2 (Rust, edition 2021) |
| 前端 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS v4 |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| 模型调用 | 前端直连 OpenAI 兼容 SSE (`useLlmStream.ts`) |
| 键模拟 | enigo 0.2（模拟 Ctrl+C 捕获选区） |
| 包管理 | Bun (JS) / Cargo (Rust) |

## 核心目录

```
src/
  App.tsx                      <- 组合根，Context 注入
  AppShortcuts.tsx             <- 全局键盘快捷键分发
  components/
    layout/FlipCard.tsx        <- 3D 翻转容器（正面=主面板，背面=设置）
    zenreply/WorkArea.tsx      <- 主面板布局
    zenreply/RoleComposer.tsx  <- 角色按钮 + 自定义输入 + 生成按钮
    zenreply/ResultCard.tsx    <- 流式结果 + 确认/取消
    settings/SettingsPanel.tsx <- API Key / Base / Model 设置
    feedback/ZenToast.tsx      <- 统一 Toast 提示
  hooks/
    useZenReplyFlow.ts         <- 核心状态机 (INPUT->GENERATING->FINISHED)
    useLlmStream.ts            <- fetch SSE + 错误映射 + abort
    useSettings.ts             <- 设置读写 + 测试连接
    useAutoResizeWindow.ts     <- ResizeObserver -> show_window 自适应高度
    useGlobalShortcuts.ts      <- 键盘事件分发
    useToast.ts                <- Toast 状态 + 自动消隐
  features/
    settings/store.ts          <- plugin-store 读写
    zenreply/prompt.ts         <- Prompt 拼装策略
    zenreply/types.ts          <- Stage / TargetRole 类型

src-tauri/src/lib.rs           <- 快捷键、选区捕获、窗口管理、系统托盘、API 测试
```

## 环境要求

- Bun 1.0+
- Rust stable
- Windows（当前主要在 Windows 场景开发验证；macOS 兼容但未完整测试）

## 快速开始

```bash
# 安装依赖
bun install

# 开发模式
bun run tauri dev

# 生产构建（输出 NSIS 安装包）
bun run tauri build
```

### 配置 API（可选，用于开发时默认注入）

在项目根目录创建 `.env`：

```env
ZENREPLY_API_KEY=your_key
ZENREPLY_API_BASE=https://api.siliconflow.cn/v1
ZENREPLY_MODEL=Pro/MiniMaxAI/MiniMax-M2.5
```

> `.env` 已被 `.gitignore` 忽略。正式使用时直接在应用内设置面板填写即可，无需 `.env`。

## 快捷键速查

| 快捷键 | 场景 | 行为 |
|---|---|---|
| `Alt+Space` | 任意应用 | 捕获选区文本 + 唤醒面板 |
| `1` / `2` / `3` | INPUT 阶段，焦点不在输入框 | 切换预设对象（老板/甲方/绿茶） |
| `4` | INPUT 阶段，焦点不在输入框 | 进入自定义对象输入 |
| `Enter` | INPUT 阶段，焦点不在输入框 | 开始生成 |
| `Enter` | FINISHED 阶段，焦点不在输入框 | 确认并复制 |
| `Esc` | 设置面板打开时 | 关闭设置 |
| `Esc` | 其他阶段 | 终止会话并隐藏窗口 |
| `Ctrl+,` | 任意 | 切换设置面板 |
| `Ctrl+S` | 设置面板打开时 | 保存设置 |

## Prompt 策略

- **老板**：恭敬但有底线，先承接再给方案和时间点（太极拳）。
- **甲方**：体面专业，强调协同与交付承诺（软钉子）。
- **绿茶**：高情商，边界清晰，避免暧昧。
- **自定义对象**：通过正则推断上位 / 亲密 / 平级关系，自动套用对应策略。
- 输出约束：仅输出可直接发送正文，禁止解释、标题、编号、AI 腔。

## 常见问题

**按 `Alt+Space` 后文本没有填入？**  
ZenReply 会先尝试快速捕获（约 87ms），再启动兜底轮询（适配 Electron 等慢速应用）。若仍失败，可手动将文字粘贴到输入框。

**窗口关闭后程序退出了？**  
正常情况下关闭窗口会隐藏到系统托盘，不退出程序。如需完全退出，右键托盘图标 -> 退出程序。

**如何切换模型或服务商？**  
`Ctrl+,` 打开设置面板，修改 API Base URL 和模型名称后点击保存即可。支持任意 OpenAI 兼容接口。

**生成按钮点击无反应？**  
通常是 API Key 未填写，或上一次请求出现阻塞性错误（Toast 提示消隐后自动恢复）。

## 后续计划

- 多 Provider 快速切换预设（SiliconFlow、OpenAI、DeepSeek 等）。
- Prompt 调参面板（温度、输出风格）。
- 回复历史与一键二次润色。