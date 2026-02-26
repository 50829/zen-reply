# ZenReply 项目开发交接文档

更新时间：2026-02-26  
适用对象：下一窗口/下一位协作者快速接手开发与发布

## 1. 项目目标

ZenReply 是一个基于 Tauri v2 + React 的桌面 AI 回复助手。  
核心目标是：用户在聊天框选中文本后，通过全局快捷键快速唤醒，生成高情商回复，并一键复制回聊天场景。

## 2. 当前已实现功能（能干什么）

1. 全局唤醒与选区捕获
- 快捷键：`Alt+Space`
- Rust 侧会尝试触发复制并读取剪贴板，作为“原始文本”注入前端。

2. AI 生成链路（前端）
- 输入：原始文本 + 沟通对象（老板/甲方/绿茶/自定义）+ 可选上下文。
- 生成：调用 OpenAI 兼容 `chat/completions` 流式接口。
- 输出：逐段渲染（SSE 文本流解析）并显示“生成中/完成”状态。

3. 设置系统（本地持久化）
- 使用 `@tauri-apps/plugin-store` 保存：
  - `api_key`
  - `api_base`（默认 `https://api.siliconflow.cn/v1`）
  - `model_name`（默认 `Pro/MiniMaxAI/MiniMax-M2.5`）
- 支持侧滑设置面板 + “测试 API”按钮。

4. 错误处理与交互
- 统一错误浮层（`ErrorToast`）显示。
- 错误 2 秒后自动淡出，回到 `INPUT` 状态。
- 常见错误语义：
  - 无 API Key
  - 401（Key 无效）
  - 402（余额不足）
  - 网络失败（TypeError）
  - 请求超时（15 秒）

5. 键盘交互
- `Cmd/Ctrl + ,`：打开/关闭设置
- `Esc`：关闭设置或终止会话
- `Enter`：`INPUT` 触发生成；`FINISHED` 确认复制
- `1/2/3`：切换预设角色；`4`：进入自定义角色编辑

6. 输入区行为
- `INPUT` 状态下“原始文本”可编辑（textarea）
- 错误期间禁用“生成”按钮（避免连击）

7. 窗口行为
- 宽度固定 600，窗口高度随内容变化自动调整（带最小/最大高度约束）

## 3. 目录结构与职责（当前）

### 3.1 前端

`src/App.tsx`
- 当前主装配层（仍较重），负责状态编排、业务流程协调、组件拼装。

`src/components/feedback/`
- `ErrorToast.tsx`：中央错误浮层
- `ToastBar.tsx`：底部提示条

`src/components/settings/`
- `SettingsDrawer.tsx`：设置面板 UI（输入、保存、测试）

`src/components/zenreply/`
- `SourceTextCard.tsx`：原始文本展示/编辑
- `RoleComposer.tsx`：角色选择、自定义角色、上下文输入、生成按钮
- `ResultCard.tsx`：结果展示、确认复制、取消

`src/hooks/`
- `useLlmStream.ts`：直接发起流式请求 + 错误映射 + 超时 + Abort
- `useTransientError.ts`：错误自动消隐（2 秒）
- `useGlobalShortcuts.ts`：全局键盘快捷键分发
- `useAutoResizeWindow.ts`：窗口尺寸跟随内容变化

`src/features/settings/store.ts`
- 设置读取/保存/标准化（plugin-store）

`src/features/zenreply/`
- `prompt.ts`：Prompt 构建
- `types.ts`：Stage/角色等类型定义

### 3.2 Rust/Tauri

`src-tauri/src/lib.rs`
- 全局快捷键注册
- 选区捕获（模拟复制）
- API 测试命令 `test_api_connection`
- 备用流式命令 `stream_generate_reply`（当前前端未使用此命令路径）

## 4. 当前技术栈与依赖

1. 桌面/后端
- Tauri v2
- Rust + reqwest + tauri plugins

2. 前端
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Framer Motion
- Lucide React

3. 关键插件
- `@tauri-apps/plugin-store`
- `@tauri-apps/plugin-clipboard-manager`
- `tauri-plugin-global-shortcut`（Rust 侧）

## 5. 最近完成的重构

1. 错误交互重构已落地
- 错误信息集中展示
- 2 秒自动淡出
- “未选中文本”不再作为“2秒后退出程序”特例，统一按普通错误处理

2. `App.tsx` 第一轮拆分已完成
- 抽出反馈组件、设置组件、ZenReply 子组件
- 抽出错误/快捷键/窗口 resize 三个 hooks

## 6. 目前存在的问题（重点）

### P0（高优先）

1. 真实流式链路有“实现分叉”
- 前端当前直接 `fetch` 第三方接口（`useLlmStream.ts`）。
- Rust 侧也保留了 `stream_generate_reply` 流式命令（可能未走通当前主路径）。
- 风险：前后端职责重叠，维护成本高，错误语义可能漂移。

2. 发布前工程化缺口仍大
- 无测试目录/用例
- 无 lint 脚本
- 无 CI 工作流
- 发布检查依赖人工

### P1（中优先）

1. `App.tsx` 仍偏大（约 500+ 行）
- 目前只是“第一轮瘦身”，业务编排仍集中。

2. 文档存在历史漂移风险
- `README` 中部分描述仍偏向旧架构（如强调 Rust SSE 主链路）。

3. 安全配置待收敛
- `src-tauri/tauri.conf.json` 中 `csp: null`，正式发布前需收紧。

### P2（低优先）

1. 类型语义可再清理
- `Stage` 包含 `ERROR`，但当前流程以 `errorMessage + INPUT` 驱动为主，未形成独立 ERROR 阶段闭环。

2. 命名与产品配置一致性
- `productName`/`identifier` 仍是模板风格（`tauri-app`），发布前需统一品牌配置。

## 7. 下一窗口建议工作顺序（可直接执行）

1. 统一流式架构（二选一并落地）
- A：保留前端直连（当前方式），删除或降级 Rust 流式命令为备用。
- B：改为前端只调 Tauri 命令，Rust 作为唯一模型代理层。

2. 继续拆分 `App.tsx`
- 新增 `useZenReplyFlow`（会话流转、生成、复制、重置）
- 新增 `useSettingsPanel`（设置读取、保存、测试）

3. 工程化补齐
- 增加 `lint`、`typecheck`、`test` 脚本
- 增加最小 CI（至少跑 typecheck + build）
- 新建 `tests/` 并先补关键逻辑测试（prompt + error mapping）

4. 发布前配置
- 更新 `tauri.conf.json` 的产品信息
- 收敛 CSP
- 补 `CHANGELOG` 与 release checklist

## 8. 快速排障提示

1. 如果“生成按钮点击无响应”
- 先看是否有 `errorMessage`（错误显示期间按钮禁用）
- 再检查设置里 `api_key` 是否为空

2. 如果“设置测试失败”
- 优先检查 `api_base` 与 `model_name` 是否匹配服务商
- 再检查网络连通性和余额状态（402）

3. 如果“窗口尺寸异常”
- 先看 `useAutoResizeWindow.ts` 是否拿到 `panelRef`
- 再看内容区域是否发生了非预期 overflow

## 9. 结论

项目主功能已可用，交互闭环完整（唤醒 -> 生成 -> 复制 -> 收口）。  
当前阶段最关键不是“再加功能”，而是“统一流式架构 + 补齐工程化 + 压缩主编排复杂度”，否则 release 风险会集中在可维护性和回归稳定性上。

