# ZenReply

> **把你想说的话，变成你该说的话。**

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)](#下载安装)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

---

## 你是否遇到过这些场景？

- 老板深夜发来模糊的需求，你不知道该怎么回才能既表态又留退路。
- 甲方催进度，你心里已经炸了，但不敢直说。
- 恋爱对象说了一句话惹你不爽，你想回怼但又怕破坏关系。

**ZenReply 是专门为这些时刻设计的。**  
它不替你做决定，只帮你把情绪化的草稿变成你真正想表达的样子——体面、清晰、一键可发。

ZenReply 是一款运行在桌面端的 **AI 沟通辅助工具**，基于 Tauri v2 构建。  
选中任意文字，按下快捷键，几秒钟内获得一条可直接发送的高情商回复。不切换应用，不泄漏数据，完全本地运行。

---

## 核心功能

### ⚡ 一键唤醒，零打断

在任意应用（微信、飞书、钉钉、浏览器…）中选中文字，按 `Alt+Space`，ZenReply 自动捕获文本并弹出面板。无需复制、无需切换窗口。按`esc`自动最小化至托盘，可重复调用

### 🎭 角色化策略润色

根据沟通对象的不同，采用完全不同的语气与策略：

| 对象 | 策略 |
|------|------|
| 👔 **老板** | 恭敬有底线，先承接再给方案和时间点（太极拳） |
| 🤝 **甲方** | 体面专业，强调协同与交付承诺（软钉子） |
| 💌 **恋爱对象** | 传递温度与情绪价值，保持自我边界，避免控制感与说教 |
| ✏️ **自定义** | 输入任意身份，自动推断上位/亲密/平级关系套用策略 |

使用数字快捷键选定对象后，可选择性输入对方刚才说的话作为背景上下文。点击`Enter`生成回复，AI 流式生成结果，确认后按`Enter`一键写入剪贴板，面板自动关闭，`Ctrl+V`直接粘贴发送：

| 输入面板 | 生成结果 |
|---|---|
| <img src="docs/image/reply-1.png" width="100%" alt="回复模式 — 输入面板"> | <img src="docs/image/reply-2.png" width="100%" alt="回复模式 — 生成结果"> |

### 🌐 英文翻译模式

`Alt+2` 切换到翻译模式，支持正式 / 轻松 / 邮件 / 简洁四种英文风格，中英职场沟通全覆盖：

| 输入面板 | 生成结果 |
|---|---|
| <img src="docs/image/translate1.png" width="100%" alt="翻译模式 — 输入面板"> | <img src="docs/image/translate2.png" width="100%" alt="翻译模式 — 翻译结果"> |

### 🔒 隐私优先

- **不上传原文**：文本仅用于本地构建 Prompt，发送给你自己配置的 AI 服务商。
- **不强制代发**：生成结果写入剪贴板，你决定是否发送。
- **API Key 本地存储**：密钥仅保存在本机，不经过任何第三方服务器。

### 🖥️ 系统托盘常驻

按`Esc`键关闭窗口后隐藏到系统托盘，不占任务栏。随时右键唤醒或直接退出。

---

## 下载安装

前往 [Releases 页面](https://github.com/50829/zen-reply/releases/latest) 下载最新版本：

- **Windows**：下载 `.exe`（NSIS 安装包）或 `.msi`。推荐下载[纯净版](https://github.com/50829/zen-reply/releases/download/v0.1.1/ZenReply_v0.1.1_x64.exe)
- **macOS**：下载 `.dmg`
- **Linux**：下载 `.deb` 或 `.AppImage`

> 首次运行需要在设置中填写你的 AI API Key。支持 SiliconFlow、OpenAI、DeepSeek 等任意 OpenAI 兼容接口。

---

## 使用流程

```
0. 双击exe，程序启动，保存在托盘
1. 选中文字（或快捷键直接打开面板手动输入）
2. Alt+Space  →  面板弹出，文本自动填入
3. 选择沟通对象  →  按 1/2/3 或 4 输入自定义
4. Enter  →  AI 流式生成回复
5. Enter  →  写入剪贴板，窗口消失，隐藏到系统托盘
6. Ctrl+V  →  粘贴发送，完成。
```

---

## 快捷键

| 快捷键 | 行为 |
|--------|------|
| `Alt+Space` | 唤醒面板（全局） |
| `Alt+1` | 切换到回复模式 |
| `Alt+2` | 切换到翻译模式 |
| `1` / `2` / `3` | 选择预设对象（回复模式）/ 选择翻译风格（翻译模式） |
| `4` | 进入自定义对象输入（回复模式）/ 简洁风格（翻译模式） |
| `Enter` | 开始生成 / 确认并复制 |
| `Esc` | 关闭设置 / 终止会话 |
| `Ctrl+,` | 打开 / 关闭设置面板 |
| `Ctrl+S` | 保存设置 |

---

## 配置 API

`Ctrl+,` 打开设置面板，填入你的服务商信息后点击「测试连接」验证，保存即可使用：

<img src="docs/image/settings.png" width="65%" alt="设置面板">

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| **API Key** | — | 你的服务商密钥 |
| **API Base URL** | `https://api.siliconflow.cn/v1` | 支持任意 OpenAI 兼容接口 |
| **模型名称** | `Pro/MiniMaxAI/MiniMax-M2.5` | 填写服务商提供的模型 ID |

---

## 常见问题

**按 `Alt+Space` 后文本没有填入？**  
ZenReply 会先快速捕获（约 130ms），若失败可手动将文字粘贴到输入框，再按 `Enter` 生成。

**窗口关闭后程序退出了？**  
正常情况关闭窗口只是隐藏到系统托盘。如需完全退出，右键托盘图标 → 退出程序。

**生成按钮无响应？**  
通常是 API Key 未配置，或上一次请求报错（等 Toast 消隐后自动恢复）。

**如何换模型或服务商？**  
`Ctrl+,` → 修改 API Base URL 和模型名称 → 保存。

---

## 本地开发

```bash
# 环境要求：Node.js 22+ / pnpm 10+ / Rust stable

pnpm install
pnpm tauri dev
```

开发时可在项目根目录创建 `.env` 注入默认 API 配置（已加入 `.gitignore`）：

```env
ZENREPLY_API_KEY=your_key
ZENREPLY_API_BASE=https://api.siliconflow.cn/v1
ZENREPLY_MODEL=Pro/MiniMaxAI/MiniMax-M2.5
```

---

## 技术栈

Tauri v2 (Rust) · React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion

---

## 后续计划

- [ ] Prompt 优化与调参调参（温度、输出长度）
- [ ] 自定义快捷键设置
- [ ] 自定义人物预设与切换
- [ ] 历史记录与二次润色
---

## License

MIT © 2026 Mirawind
