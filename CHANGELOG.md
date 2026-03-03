# Changelog

所有版本的重要变更记录于此文档。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## [0.1.1] - 2026-03-03

### 新增
- **英文翻译模式**：`Alt+2` 切换，支持正式 / 轻松 / 邮件 / 简洁四种风格。`Alt+1` 返回中文回复模式。
- **恋爱对象**角色预设（原"绿茶"），策略升级为传递情绪价值 + 保持自我边界。

### 修复
- 修复从 bun 迁移至 pnpm 后，`tauri.conf.json` 中构建命令未同步导致窗口无法显示的问题。
- 修复毛玻璃卡片在特定场景下发光效果异常的视觉 bug。

### 变更
- 包管理器从 bun 迁移至 pnpm，新增 CI/CD 流水线（GitHub Actions）。
- 角色标识符 `greenTea` 重命名为 `lover`，与功能语义对齐。

---

## [0.1.0] - 2026-03-01

### 新增
- 全局快捷键 `Alt+Space` 唤醒面板，自动捕获当前选中文本（enigo 模拟 Ctrl+C）。
- 角色化回复：老板 / 甲方 / 恋爱对象 / 自定义（自动推断权力关系）。
- 前端直连 OpenAI 兼容 SSE 接口，流式逐字渲染。
- 系统托盘常驻，关闭窗口隐藏而非退出，托盘菜单支持打开主面板 / 设置 / 退出。
- 设置面板（3D 翻转动效）：API Key / Base URL / 模型名称本地持久化。
- 键盘优先操作：全流程可不碰鼠标完成。
- 统一 Toast 提示（success / error / info），错误消隐后自动恢复按钮状态。
- 窗口自适应内容高度（ResizeObserver → show_window IPC）。
- `Alt+Space` 兜底轮询捕获，适配微信等慢速应用。

[0.1.1]: https://github.com/mirawind/zenreply/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mirawind/zenreply/releases/tag/v0.1.0
