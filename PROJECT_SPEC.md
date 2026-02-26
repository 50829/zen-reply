# PROJECT_SPEC

项目技术规范（核心）

状态：Active  
适用范围：本仓库全部代码（`src/`、`src-tauri/`、配置文件、脚本、文档）  
规范级别：`MUST`（强制） / `SHOULD`（建议） / `MAY`（可选）

## 1. 目标与原则

- `MUST` 以可维护、可测试、可发布为第一目标。
- `MUST` 保持跨端一致性（前端 React/TS 与 Rust/Tauri 在接口、错误语义、日志语义上统一）。
- `MUST` 避免“能跑就行”式实现，所有关键路径必须可观测、可回归验证。

## 2. 技术基线

- `MUST` 前端使用 React + TypeScript + Vite。
- `MUST` 桌面壳与系统能力使用 Tauri v2 + Rust。
- `MUST` 使用 Bun 作为 JS 依赖安装与脚本执行工具（与现有项目一致）。
- `MUST` 锁定依赖：前端依赖通过 `bun.lock`，Rust 依赖通过 `Cargo.lock`。
- `SHOULD` 保持 Node.js 18+、Bun 1.x、Rust stable。

## 3. 目录与模块边界

- `MUST` 前端业务代码放在 `src/`，Rust 后端代码放在 `src-tauri/src/`。
- `MUST` 将“能力边界”拆分清晰：
- 前端 UI/状态逻辑与 Prompt 规则分离。
- Rust 侧命令注册、系统能力、模型调用分层。
- `SHOULD` 新功能按 `feature` 拆目录，避免所有逻辑堆在单文件。

## 4. 代码格式与风格

### 4.1 缩进与空白

- `MUST` 全仓库禁止 Tab，统一使用空格。
- `MUST` TypeScript/TSX/CSS/JSON/YAML/Markdown 使用 **2 空格缩进**。
- `MUST` Rust 使用 **4 空格缩进**（遵循 `rustfmt` 默认风格）。
- `SHOULD` 单行长度控制在 100 字符以内，超长时换行。

### 4.2 命名约定

- `MUST` TypeScript 变量/函数使用 `camelCase`，组件使用 `PascalCase`，常量使用 `UPPER_SNAKE_CASE`。
- `MUST` Rust 函数/变量使用 `snake_case`，类型/trait 使用 `PascalCase`，常量使用 `UPPER_SNAKE_CASE`。
- `MUST` 文件名语义化；React 组件文件使用 `PascalCase.tsx` 或与现有风格保持一致。

### 4.3 注释语言

- `MUST` 代码注释与文档注释使用 **英文**（团队统一语言，便于工具链与外部协作）。
- `SHOULD` 遇到中文业务语义（如 Prompt 策略）时，可采用“英文主注释 + 中文补充说明”。
- `MUST` 禁止无信息量注释（如“set value”），注释必须解释“为什么”，而不是“做了什么”。

## 5. 错误处理与日志

### 5.1 通用约束

- `MUST` 禁止将 `print/println!/eprintln!/console.log` 作为正式错误处理手段。
- `MUST` 使用统一日志接口记录运行状态与错误（按级别：`debug/info/warn/error`）。
- `MUST` 错误信息分两层：
- 面向用户：可理解、可操作（例如“请检查 API Key 配置”）。
- 面向开发：保留上下文（模块、请求 ID、状态码、原始错误摘要）。

### 5.2 TypeScript/React

- `MUST` 异步流程使用 `try/catch` 或 Promise `catch` 完整收口错误。
- `MUST` 在边界层处理错误：
- UI 层负责提示（toast/状态文案）。
- hook/service 层负责错误归一化与上抛。
- `MUST` 禁止静默吞错；若确实忽略，必须写明原因注释（`intentionally ignored`）。

### 5.3 Rust/Tauri

- `MUST` 业务函数优先返回 `Result<T, E>`，用 `?` 传播错误。
- `MUST` 仅在 Tauri 命令边界将错误转换为可传输格式（如 `String`）。
- `MUST` 运行时路径禁止无理由 `unwrap/expect/panic!`。
- `SHOULD` 为关键失败点补充错误上下文（接口地址、请求 ID、阶段信息）。

## 6. 安全与配置

- `MUST` 严禁提交真实密钥、令牌、账号等敏感信息到仓库。
- `MUST` `.env` 保持忽略，`.env.example` 必须与当前运行参数同步。
- `MUST` 对 Tauri capability 与权限最小化，仅授予实际需要的能力。
- `SHOULD` 生产构建启用 CSP（避免长期 `csp: null`）。

## 7. 测试策略

- `MUST` 为核心逻辑补充自动化测试：
- 前端：Prompt 构建、状态流转、关键 hook 行为。
- Rust：SSE 解析、取消逻辑、错误分支。
- `MUST` 修复 bug 时同步新增回归测试。
- `SHOULD` 引入分层测试：单元测试 > 集成测试 > 关键路径 E2E。

## 8. 质量门禁（本地与 CI）

- `MUST` 合并前至少通过：
- 格式化检查
- 静态检查（lint）
- 类型检查（TypeScript）
- 测试
- 构建（frontend build + tauri build）
- `SHOULD` 在 CI 中串联上述门禁，禁止未通过直接合并。

## 9. Git 与变更管理

- `MUST` 使用清晰提交信息（建议 Conventional Commits：`feat/fix/refactor/docs/test/chore`）。
- `MUST` 单个 PR 聚焦单一主题，避免“混合改动”。
- `MUST` 影响行为的改动必须附带：
- 变更说明
- 风险点
- 回滚方案（至少描述如何恢复）

## 10. 发布规范（Release）

- `MUST` 遵循语义化版本（SemVer）：`MAJOR.MINOR.PATCH`。
- `MUST` 发布前执行完整检查清单：
- 版本号更新
- Changelog 更新
- 依赖锁文件同步
- 质量门禁全绿
- 配置与密钥检查
- `SHOULD` 为每个 release 记录已知限制与后续计划。

## 11. 文档维护

- `MUST` 行为变更后同步更新 `README` 与相关规范文档。
- `SHOULD` 保持示例命令与实际脚本一致，避免文档漂移。

---

执行建议（下一步）：

1. 增加 lint/format/test 脚本并落地到 `package.json` 与 Rust 工具链。  
2. 建立 `.github/workflows`，把第 8 节质量门禁自动化。  
3. 在 release 前按第 10 节建立固定 checklist。  
