# PROJECT_SPEC

项目技术规范（核心）

状态：Active  
更新时间：2026-03-01  
适用范围：本仓库全部代码（`src/`、`src-tauri/`、配置文件、脚本、文档）  
规范级别：`MUST`（强制） / `SHOULD`（建议） / `MAY`（可选）

---

## 1. 目标与原则

- `MUST` 以可维护、可测试、可发布为第一目标。
- `MUST` 保持跨端一致性（前端 React/TS 与 Rust/Tauri 在接口、错误语义、日志语义上统一）。
- `MUST` 避免"能跑就行"式实现，所有关键路径必须可观测、可回归验证。

---

## 2. 技术基线

| 层 | 技术 | 版本要求 |
|---|---|---|
| 桌面壳 | Tauri v2 + Rust | Rust stable (edition 2021) |
| 前端 | React 19 + TypeScript + Vite | Node.js 18+, Bun 1.x |
| 样式 | Tailwind CSS v4 | |
| 动画 | Framer Motion | |
| 图标 | Lucide React | |
| 键模拟 | enigo 0.2 | |
| HTTP | 前端 fetch (SSE) / Rust reqwest (测试连接) | |

- `MUST` 使用 Bun 作为 JS 依赖安装与脚本执行工具。
- `MUST` 锁定依赖：前端依赖通过 `bun.lock`，Rust 依赖通过 `Cargo.lock`。

---

## 3. 架构设计

### 3.1 总体分层

```
┌────────────────────────────────────────────────────────┐
│ Tauri Window (transparent, decorations=false)          │
│                                                        │
│  ┌─────────────── React App ────────────────────────┐  │
│  │ App.tsx (组合根)                                  │  │
│  │   └── AppProvider (Context 聚合)                 │  │
│  │         ├── ToastContext     → ZenToast           │  │
│  │         ├── SettingsContext  → SettingsPanel(背面)│  │
│  │         └── ZenReplyContext  → WorkArea (正面)   │  │
│  │                                                   │  │
│  │   AppInner                                        │  │
│  │     ├── AppShortcuts (键盘事件分发)               │  │
│  │     ├── FlipCard (3D 翻转容器，仅 isAwake 时渲染) │  │
│  │     └── ZenToast                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────── Rust Backend ─────────────────────┐  │
│  │ lib.rs                                            │  │
│  │   ├── on_shortcut_pressed  (异步线程，快捷键唤醒) │  │
│  │   ├── quick_capture / fallback_capture            │  │
│  │   ├── hide_window / show_window (Tauri commands)  │  │
│  │   ├── test_api_connection   (Tauri command)       │  │
│  │   └── TrayIconBuilder       (系统托盘)            │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 3.2 职责边界

| 职责 | 归属 | 说明 |
|---|---|---|
| 全局快捷键、窗口生命周期 | Rust | `global-shortcut` + `window.show/hide` |
| 选区捕获（模拟 Ctrl+C） | Rust | enigo，必须在 `window.show()` 前执行 |
| AI 流式请求 | 前端 | `useLlmStream.ts` → fetch SSE |
| API 测试 | Rust | `test_api_connection` command，因为前端需要走 Tauri 命令才能绕过 CORS |
| 设置持久化 | 前端 | `@tauri-apps/plugin-store` |
| 剪贴板写入（结果复制） | 前端 | `@tauri-apps/plugin-clipboard-manager` |
| UI 状态管理 | 前端 | React hooks（无外部状态库） |

- `MUST` 前端不直接操作窗口可见性（需通过 `invoke("hide_window")` 或 fallback `getCurrentWindow().hide()`）。
- `MUST` Rust 侧不持有业务状态（仅透传剪贴板文本）。

### 3.3 事件通信

Rust → React 通过 Tauri `emit`，React → Rust 通过 `invoke`。

| 事件名 | 方向 | 含义 |
|---|---|---|
| `zenreply://clipboard-text` | Rust → React | 快捷键唤醒，payload 含已捕获文本（可能为空） |
| `zenreply://clipboard-captured` | Rust → React | 兜底捕获成功后补发，仅补填文本不重置 UI |
| `zenreply://tray-wake` | Rust → React | 托盘「打开主面板」点击 |
| `zenreply://tray-open-settings` | Rust → React | 托盘「打开设置」点击 |

| 命令名 | 方向 | 含义 |
|---|---|---|
| `hide_window` | React → Rust | 隐藏窗口，同时更新托盘菜单 |
| `show_window(w, h)` | React → Rust | resize+center+show+focus 合并调用，减少 IPC 往返 |
| `test_api_connection` | React → Rust | 测试 API 连通性（Rust 侧绕过前端 CORS 限制）|

### 3.4 状态机

```
         ┌───── Alt+Space (onWake) ─────┐
         │                              │
         ▼                              │
      INPUT ──── startGenerating ──► GENERATING
         ▲                              │
         │                              ▼
         │                          FINISHED
         │                              │
         └──────── confirmAndCopy ──────┘
                   (→ hide → reset)

      任意状态 ──── Esc ──► terminateSession ──► hide + reset
```

- `MUST` Stage 仅有三个值：`INPUT` | `GENERATING` | `FINISHED`
- `MUST` 所有错误回退到 `INPUT`（不设独立 ERROR 状态）

---

## 4. 启动流程规范（关键路径）

### 4.1 核心约束

> **`MUST` 模拟按键式剪贴板捕获在 `window.show()` 之前完成。**

原因：enigo 模拟 Ctrl+C 作用于 OS 当前焦点窗口。`window.show()` + `set_focus()` 会将焦点从源应用夺走，导致 Ctrl+C 发送到 ZenReply 窗口而非源应用。

### 4.2 规定的启动时序

```
Alt+Space Released
  |
  +-- 独立线程（std::thread::spawn，不阻塞 Tauri 事件循环）
        |
        ├── 1. 读取剪贴板（记录 previous）
        ├── 2. sleep 30ms（等待 OS 处理按键释放）
        ├── 3. enigo Ctrl+C（模拟复制）
        ├── 4. sleep 50ms（等待源应用处理复制）
  ├── 5. 读取剪贴板（对比 previous，得到 text）
  │      总耗时 ~87ms
  │
  ├── 6. emit("zenreply://clipboard-text", { text })
  │      前端收到后：onWake(text) → 状态重置 + 文本填入
  │      前端在 useAutoResizeWindow 测量完成后调用 show_window
  │      （不在 Rust 侧 show，避免透明壳闪烁）
  │
  └── 7. if text.is_empty():
           fallback_capture（再次 Ctrl+C + 轮询 10×30ms）
           成功后 emit("zenreply://clipboard-captured", { text })
           前端收到后：仅 setRawText(text)，不重置 UI
```

### 4.3 前端唤醒规范

- `MUST` FlipCard 仅在 `isAwake === true` 时渲染
- `MUST` `isAwake` 初始为 `false`，`onWake` 设为 `true`，`resetFlow` 设为 `false`
- `MUST` 收到 `clipboard-text` 事件时调用 `onWake(text)`——重置所有状态 + 填入文本
- `MUST` 收到 `clipboard-captured` 事件时仅调用 `setRawText(text)`——不重置 UI

### 4.4 动画规范

- `MUST` FlipCard 的 `initial` 始终为固定动画起点 `{ y: 20, opacity: 0, scale: 0.95 }`
- `MUST` 不使用 `panelAnimateKey === 0 ? false : ...` 等条件 hack
- `MUST` 通过条件渲染（`isAwake`）确保 FlipCard 在窗口变为可见时从零挂载——只有一次入场动画

---

## 5. 代码格式与风格

### 5.1 缩进与空白

- `MUST` 全仓库禁止 Tab，统一使用空格。
- `MUST` TypeScript/TSX/CSS/JSON/YAML/Markdown 使用 **2 空格缩进**。
- `MUST` Rust 使用 **4 空格缩进**（遵循 `rustfmt` 默认风格）。
- `SHOULD` 单行长度控制在 100 字符以内，超长时换行。

### 5.2 命名约定

- `MUST` TypeScript 变量/函数使用 `camelCase`，组件使用 `PascalCase`，常量使用 `UPPER_SNAKE_CASE`。
- `MUST` Rust 函数/变量使用 `snake_case`，类型/trait 使用 `PascalCase`，常量使用 `UPPER_SNAKE_CASE`。
- `MUST` 文件名语义化；React 组件文件使用 `PascalCase.tsx`。

### 5.3 注释语言

- `MUST` 代码注释与文档注释使用 **英文**。
- `SHOULD` 遇到中文业务语义（如 Prompt 策略）时，可采用"英文主注释 + 中文补充说明"。
- `MUST` 禁止无信息量注释（如"set value"），注释必须解释"为什么"，而不是"做了什么"。

---

## 6. 错误处理

### 6.1 通用约束

- `MUST` 错误信息分两层：
  - 面向用户：可理解、可操作（例如"请检查 API Key 配置"）。
  - 面向开发：保留上下文（模块、状态码、原始错误摘要）。

### 6.2 TypeScript/React

- `MUST` 异步流程使用 `try/catch` 完整收口错误。
- `MUST` 错误归一化在 hook/service 层（`toErrorMessage`），UI 层只负责展示（Toast）。
- `MUST` 禁止静默吞错；若确实忽略，必须写明原因注释（`intentionally ignored`）。
- `MUST` 所有阻塞性错误通过 `hasBlockingError` 禁用生成按钮，Toast 消隐后自动恢复。

### 6.3 Rust/Tauri

- `MUST` 业务函数优先返回 `Result<T, E>`，用 `?` 传播错误。
- `MUST` 仅在 Tauri 命令边界将错误转换为 `String`。
- `MUST` 运行时路径禁止无理由 `unwrap/expect/panic!`。
- `SHOULD` `capture_selected_text` 中的剪贴板读取失败静默降级（返回空字符串），不阻塞启动。

---

## 7. 安全与配置

- `MUST` 严禁提交真实密钥到仓库。
- `MUST` Tauri capability 最小化授权（当前：core:default, opener:default, clipboard read/write, store:default）。
- `SHOULD` 生产构建启用 CSP（避免长期 `csp: null`）。
- `SHOULD` `tauri.conf.json` 中 `productName` 和 `identifier` 在发布前替换为正式品牌值。

---

## 8. 测试策略

- `MUST` 为核心逻辑补充自动化测试：
  - 前端：Prompt 构建（`prompt.ts`）、错误映射（`utils.ts`）、关键 hook 行为。
  - Rust：Tauri command 返回值、错误分支。
- `MUST` 修复 bug 时同步新增回归测试。
- `SHOULD` 引入分层测试：单元测试 > 集成测试 > 关键路径 E2E。

---

## 9. 质量门禁

- `MUST` 合并前至少通过：
  - TypeScript 类型检查（`tsc --noEmit`）
  - Rust 编译检查（`cargo check`）
  - 构建（`bun run build` + `cargo build`）
- `SHOULD` 在 CI 中串联上述门禁。
- `SHOULD` 增加格式化检查和 lint。

---

## 10. Git 与变更管理

- `MUST` 使用清晰提交信息（Conventional Commits：`feat/fix/refactor/docs/test/chore`）。
- `MUST` 单个 PR/commit 聚焦单一主题。
- `MUST` 影响用户可感知行为的改动附带变更说明和回滚方案。

---

## 11. 发布规范

- `MUST` 遵循语义化版本（SemVer）：`MAJOR.MINOR.PATCH`。
- `MUST` 发布前检查清单：
  - 版本号更新（`package.json` + `tauri.conf.json` + `Cargo.toml`）
  - 依赖锁文件同步
  - 质量门禁全绿
  - CSP 已配置
  - 品牌配置已更新

---

## 12. 文档维护

- `MUST` 行为变更后同步更新 `PROJECT_HANDOFF.md`（开发交接文档）。
- `MUST` 架构/规范变更后同步更新本文件（`PROJECT_SPEC.md`）。
- `SHOULD` 保持示例命令与实际脚本一致。
