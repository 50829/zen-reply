ZenReply: An AI-powered desktop copilot that transforms your raw emotions into professional, high-EQ responses instantly.

# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Real Streaming API Config

Create a `.env` file at project root (already scaffolded) and fill:

- `ZENREPLY_API_KEY`: your model provider key (required)
- `ZENREPLY_API_BASE`: OpenAI-compatible base URL (optional, default `https://api.openai.com/v1`)
- `ZENREPLY_MODEL`: model id (optional, default `gpt-4o-mini`)

SiliconFlow example:

- `ZENREPLY_API_BASE=https://api.siliconflow.cn/v1`
- `ZENREPLY_MODEL=deepseek-ai/DeepSeek-V3`

`.env` is auto-loaded by Rust on startup via `dotenvy`.

PowerShell override example:

```powershell
$env:ZENREPLY_API_KEY="sk-xxxxx"
$env:ZENREPLY_API_BASE="https://api.deepseek.com/v1"
$env:ZENREPLY_MODEL="deepseek-chat"
bun run tauri dev
```
