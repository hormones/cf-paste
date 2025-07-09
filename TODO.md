# 📋 CF-Paste 国际化重构任务清单

## 🎯 项目目标
实现基于 Vue I18n + 自建后端的国际化方案，同时集中管理所有公共资源文件。

## 📁 第一阶段：公共资源集中管理

### ✅ 1.1 创建公共目录结构 ✅
- [x] 创建 `shared/` 目录作为前后端共享资源根目录
- [x] 创建 `shared/types/` 目录存放类型定义
- [x] 创建 `shared/constants/` 目录存放常量定义
- [x] 创建 `shared/locales/` 目录存放国际化资源
- [x] 创建 `shared/utils/` 目录存放共享工具函数

### ✅ 1.2 迁移现有公共文件 ✅
- [x] 移动 `paste-configuration.d.ts` → `shared/types/index.d.ts`（全局类型定义，无需更新导入）
- [x] 移动 `constants.ts` → `shared/constants/index.ts`
- [x] 验证前后端项目正常编译

### ✅ 1.3 设置构建配置 ✅
- [x] 配置 `tsconfig.json` 路径映射：`@shared/*` → `shared/*`
- [x] 配置 Vite 别名：`@shared` 指向 `shared` 目录
- [x] 配置 Worker TypeScript 路径解析
- [x] 测试构建和开发环境下的路径解析

## 🌍 第二阶段：国际化基础设施 ✅

### ✅ 2.1 语言包设计和创建 ✅
- [x] 设计语言包结构（按语言划分，符合国际化规范）
  - [x] `shared/locales/en.json` - 英文语言包（基准）
  - [x] `shared/locales/zh-CN.json` - 中文简体语言包
  - [x] 语言包内部按功能模块组织：common、components、messages、errors、validation
- [x] 创建语言包索引文件 `shared/locales/index.ts`
- [x] 添加 TypeScript 类型定义确保类型安全

### ✅ 2.2 前端国际化配置
- [x] 安装 Vue I18n：`npm install vue-i18n@9`
- [x] 扩展现有 `/api/pass/config` 端点支持语言配置
  - [x] 在 `server/api/pass.ts` 中集成 `shared/i18n/detectLanguage()` 
  - [x] 读取 `env.LANGUAGE` 变量（wrangler.jsonc中已配置）
  - [x] 解析 Cloudflare `request.cf.country` 和 `Accept-Language` 头
  - [x] 在配置响应中添加 `language` 字段
- [x] 扩展前端配置类型和逻辑
  - [x] 扩展 `PasteConfig` 接口添加 `language: string` 字段
  - [x] 修改 `stores/index.ts` 支持语言配置存储
  - [x] 在 `DefaultTemplate.vue` 初始化时自动获取语言配置（无需localStorage处理）
- [x] 创建 Vue I18n 配置
  - [x] 创建 `src/i18n/index.ts` Vue I18n 配置文件
  - [x] 实现语言优先级：服务端检测 > 默认值
  - [x] 创建 `useI18n` composable 包装器
- [x] 集成到 Vue 应用
  - [x] 在 `main.ts` 中注册 Vue I18n 

### ✅ 2.3 后端国际化配置 ✅
- [x] 创建 `server/i18n/index.ts` 轻量级翻译函数
- [x] 集成 `shared/i18n/detectLanguage()` 到API响应中（已在2.2中通过配置端点实现）
- [x] 设计 API 响应国际化策略
  - [x] 创建服务端消息翻译函数
  - [x] 更新所有API错误响应支持多语言
  - [x] 确保服务端检测的语言与前端保持一致

## 🔧 第三阶段：前端组件迁移

### ✅ 3.1 迁移现有文本资源到Vue I18n（基础设施完成后进行）
- [ ] 更新 `shared/constants/index.ts` 使用语言包中的过期时间选项
  - [ ] 修改 `EXPIRY_OPTIONS` 为函数，根据当前语言返回本地化选项
  - [ ] 移除 `MESSAGES` 常量，改用 Vue I18n 翻译函数
- [ ] 创建前端翻译函数包装器
  - [ ] 在 `src/composables/useI18n.ts` 中创建翻译函数
  - [ ] 提供 `t()` 函数用于组件中的文本翻译
  - [ ] 提供 `getExpiryOptions()` 函数返回本地化的过期选项
- [ ] 批量替换组件中的硬编码文本
  - [ ] 扫描所有 Vue 组件，提取硬编码文本
  - [ ] 使用 `$t()` 或 `t()` 函数替换硬编码字符串
  - [ ] 确保所有文本都对应语言包中的翻译键

### ✅ 3.2 核心组件迁移
- [ ] **PageHeader.vue**
  - [ ] 迁移 "Clipboard", "Settings", "Switch to dark/light mode" 等文本
  - [ ] 迁移确认对话框文本："Are you sure..."
  - [ ] 更新工具提示文本
- [ ] **SettingsDialog.vue**
  - [ ] 迁移 "Settings", "Expiration Time", "Access Password" 等文本
  - [ ] 迁移表单标签和帮助文本
  - [ ] 迁移按钮文本："Cancel", "Save Settings"

### ✅ 3.3 功能组件迁移
- [ ] **TabsContainer.vue**
  - [ ] 迁移标签页标题："Clipboard", "Files"
- [ ] **ClipboardPanel.vue**
  - [ ] 迁移占位符文本和提示文本
- [ ] **FileTable.vue**
  - [ ] 迁移表头、操作按钮、状态文本
- [ ] **FileUploadPanel.vue**
  - [ ] 迁移上传相关的所有文本
- [ ] **PasswordDialog.vue**
  - [ ] 迁移密码对话框文本

### ✅ 3.4 状态和消息迁移
- [ ] 迁移 `useMain` composable 中的消息文本
- [ ] 迁移 `useFileUpload` composable 中的状态文本
- [ ] 迁移 `useSettings` composable 中的提示文本
- [ ] 更新所有 ElMessage 调用使用国际化文本

## 🛠️ 第四阶段：后端 API 迁移 ✅

### ✅ 4.1 错误消息国际化 ✅
- [x] **server/authentication.ts**
  - [x] 迁移 "Access denied", "Authentication required" 等错误
- [x] **server/api/data.ts**
  - [x] 迁移 "Keyword not found", "Failed to save settings" 等错误
- [x] **server/api/file.ts**
  - [x] 迁移文件操作相关错误消息
- [x] **server/api/pass.ts**
  - [x] 迁移密码验证错误消息
- [x] **server/bindings/r2.ts**
  - [x] 迁移存储操作相关错误消息
- [x] **server/index.ts**
  - [x] 迁移路由错误消息

### ✅ 4.2 API 响应国际化 ✅
- [x] 统一 API 响应格式包含语言信息
- [x] 更新所有错误响应消息使用国际化
- [x] 确保错误码与多语言消息的对应关系
- [x] 扩展语言包支持所有API错误消息
- [x] 支持参数化错误消息（文件大小、分块序号等）

## ⚙️ 第五阶段：配置和集成

### ✅ 5.1 环境配置
- [ ] 更新 `wrangler.example.jsonc` 添加国际化配置说明
- [ ] 更新 Vite 配置支持环境变量注入
- [ ] 配置开发环境语言热重载
- [ ] 设置生产环境语言包优化

### ✅ 5.2 用户体验优化
- [ ] 确保语言检测的准确性和一致性
- [ ] 优化初始加载时的语言应用体验
- [ ] 测试不同地区和浏览器语言的检测效果

### ✅ 5.3 Element Plus 集成
- [ ] 配置 Element Plus 国际化
- [ ] 同步 Element Plus 组件语言与应用语言
- [ ] 测试所有 Element Plus 组件的多语言显示

## 📚 第六阶段：文档

### ✅ 6.1 文档更新
- [ ] 更新 `README.md` 添加多语言支持说明
- [ ] 更新 `README_zh-cn.md` 同步多语言功能  
- [ ] 编写开发者文档：如何添加新的翻译
- [ ] 说明自动语言检测机制：环境变量 → 地区检测 → Accept-Language → 默认英文

## 🎯 里程碑检查点

- **里程碑 1**：公共资源集中管理完成 ✅
- **里程碑 2**：国际化基础设施就绪 ✅
  - ✅ 语言包设计和创建完成  
  - ✅ 前端国际化配置（通过现有配置API集成，服务端自动检测）
  - ✅ 后端国际化配置（服务端翻译函数，语言自动检测）
- **里程碑 3**：前端组件迁移完成
- **里程碑 4**：后端 API 迁移完成 ✅  
- **里程碑 5**：配置集成完成
- **里程碑 6**：文档更新完成

## 📋 注意事项

1. **渐进式迁移**：每个阶段完成后确保项目仍可正常运行
2. **向后兼容**：保持现有 API 响应格式的兼容性
3. **性能影响**：监控国际化对首屏加载时间的影响
4. **类型安全**：确保所有翻译 key 都有完整的 TypeScript 类型支持
5. **语言策略**：采用服务端自动检测，无需客户端切换功能，保持轻量化
6. **代码审查**：每个阶段完成后进行代码审查
7. **备份策略**：重要迁移前创建代码备份

---

**预计总工期**：1-2 周（不含测试和部署验证）
**优先级**：P0（核心功能） > P1（用户体验） > P2（优化改进）

---

## 📝 最新进展（最后更新：后端国际化完成）

### 🎯 已完成的关键工作

**1. 服务端翻译函数架构**
- ✅ 创建 `server/i18n/index.ts` 轻量级翻译函数
- ✅ 支持参数化消息模板和默认语言降级
- ✅ 与现有 `shared/i18n/detectLanguage()` 完美集成

**2. 全面的API错误消息国际化**
- ✅ `server/authentication.ts` - 身份验证和权限错误
- ✅ `server/api/pass.ts` - 密码验证错误
- ✅ `server/api/data.ts` - 数据操作错误（关键词、设置等）
- ✅ `server/api/file.ts` - 文件操作错误（上传、下载、分片等）
- ✅ `server/bindings/r2.ts` - 存储操作错误
- ✅ `server/index.ts` - 路由和系统错误

**3. 语言包完善**
- ✅ 添加30+个新的错误消息到 `en.json` 和 `zh-CN.json`
- ✅ 支持参数化消息（文件大小限制、分块编号等）
- ✅ 完整的TypeScript类型支持

**4. API架构改进**
- ✅ 扩展R2存储函数支持language参数
- ✅ 所有API调用自动传递语言信息
- ✅ 错误响应使用用户检测的语言

### 🚀 技术亮点

- **自动语言检测**：通过 `authentication.ts` 的 `prepare` 函数统一处理
- **智能语言传递**：从cookie → context → API → R2 的完整链路
- **优雅降级机制**：无语言信息时自动使用默认英文
- **性能优化**：服务端翻译函数轻量级，无额外性能开销

### 🎯 下一步重点：前端组件迁移

现在后端国际化基础设施已全部就绪，接下来的重点是：
1. 前端组件文本迁移到Vue I18n
2. Element Plus国际化集成
3. 用户体验优化和测试 