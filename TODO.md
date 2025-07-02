# 安全下载功能开发任务列表

本文档根据 `详细设计.md` (v2.4) 方案，列出了所有需要完成的开发任务。

## 阶段一：后端开发

-   [x] **数据库迁移**
    -   [x] 在 `schema.sql` 中添加 `CREATE TABLE tokens` 的 SQL 语句。
    -   [x] 执行 D1 数据库迁移命令，应用新的表结构。

-   [x] **实现下载API端点**
    -   [x] 在 `server/api/file.ts` 中修改/创建 `GET /api/file/download/:fileName` 路由。
    -   [x] **关键**: 在此路由的认证中间件或处理逻辑中，必须能区分**分享者**和**浏览者**。
        -   [x] **分享者路径**: 受主密码保护，直接代理下载并支持`Range`请求。
        -   [x] **浏览者路径**: 拒绝请求或重定向，因为浏览者必须通过带Token的URL下载。

-   [x] **实现浏览者(Viewer)下载会话API**
    -   [x] **创建会话**: 在 `server/api/file.ts` 中创建路由 `GET /api/file/auth-download`。
        -   [x] 确保此路由受 `view_word` 认证保护。
        -   [x] 实现生成唯一Token、获取IP、设置1小时初始过期时间的逻辑。
        -   [x] 将会话数据存入D1的 `tokens` 表。
    -   [x] **执行下载**: 在 `server/api/file.ts` 中创建路由 `GET /api/file/download/:token/:fileName`。
        -   [x] 实现对Token的有效性验证（存在、未过期、IP匹配）。
        -   [x] 实现对 `view_word` 的实时校验（查询 `keyword` 表）。
        -   [x] **关键**: 实现"条件滑动过期"逻辑：
            -   [x] 检查Token剩余有效期是否小于30分钟。
            -   [x] 如果是，则执行 `UPDATE tokens SET expires_at = ...`。
        -   [x] 复用或实现支持 `Range` 请求的下载代理逻辑。

-   [x] **更新现有定时清理Worker**
    -   [x] 在 `server/schedule/index.ts` 的现有定时任务中，加入清理 `tokens` 表的逻辑。
    -   [x] 确认 `wrangler.jsonc` 中 `[[triggers]]` 的cron表达式为每日0点 (`0 0 * * *`)。
    -   [x] 添加 SQL `DELETE FROM tokens WHERE expire_time <= ?` 到清理函数中。

## 阶段二：前端开发

-   [x] **API层对接**
    -   [x] 在 `src/api/file.ts` 中添加 `getDownloadAuth()` 方法，用于获取会话Token。
    -   [x] 修改原有的 `download()` 方法，使其能够根据用户模式（分享者/浏览者）构造不同的URL。

-   [x] **状态管理**
    -   [x] 在 Pinia store (`src/stores/index.ts`) 或 `useFileUpload` 中增加状态 `sessionToken`。
    -   [x] 确保 `isOwnerMode` 或 `viewMode` 状态可以正确区分用户模式。

-   [x] **组件逻辑修改**
    -   [x] **浏览模式进入时**: 验证 `view_word` 成功后，立即调用 `getDownloadAuth()` 并保存 `sessionToken`。
    -   [x] **下载按钮点击事件** (`src/components/FileTable.vue`):
        -   [x] `handleFileDownload` 函数现在应调用一个统一的下载方法（例如 `fileApi.download(...)`）。
        -   [x] 该方法内部会根据 `viewMode` 和 `sessionToken` 的状态，自动构造正确的下载URL。
    -   [ ] **会话失效处理**:
        -   在 `request.ts` 的响应拦截器或下载方法的 `catch` 块中处理 `403 Forbidden` 错误。
-   [ ] 当检测到会话失效时，清空前端存储的 `sessionToken`，并可以弹出提示，引导用户重新验证。

## 阶段三：测试与部署

-   [ ] **单元/集成测试**
    -   [ ] 测试分享者通过 `/api/file/download/:fileName` 成功下载。
    -   [ ] 测试浏览者直接访问 `/api/file/download/:fileName` 被拒绝。
    -   [ ] 测试浏览者通过 `auth-download` -> `download/:token/:fileName` 的完整流程。
    -   [ ] 测试"条件滑动过期"：
        -   [ ] 在Token有效期 > 30分钟时下载，`expires_at`不应更新。
        -   [ ] 在Token有效期 < 30分钟时下载，`expires_at`应被刷新。
    -   [ ] 测试更改`view_word`后，旧会话Token是否立即失效。
-   [ ] **部署**
    -   [ ] 部署到Cloudflare Workers。
    -   [ ] 验证生产环境功能是否正常。 