# 编码规范

开发人员在实际编码前，必须先了解技术栈、目录结构、编码要求。

## 技术栈

- **前端**: Vue 3.5.13 + TypeScript 5.8.0 + Element Plus 2.10.1 + Pinia 3.0.3
- **后端**: Cloudflare Workers + itty-router 5.0.18
- **数据库**: Cloudflare D1 (SQLite)
- **文件存储**: Cloudflare R2
- **构建工具**: Vite 6.2.4 + Wrangler 4.19.2

## 目录结构

```
cf-paste/
├── src/                    # 前端源码
│   ├── api/               # API接口
│   ├── components/        # Vue组件
│   ├── composables/       # 组合式函数
│   ├── stores/           # Pinia状态管理
│   ├── types/            # 类型定义
│   └── utils/            # 工具函数
├── server/               # 后端源码
│   ├── api/             # API处理器
│   ├── bindings/        # Cloudflare绑定(D1/R2)
│   ├── utils/           # 工具函数
│   └── index.ts         # Workers入口
├── constants.ts         # 全局常量
└── schema.sql          # 数据库结构
└── wrangler.jsonc          # Cloudflare Workers部署配置
└── paste-configuration.d.ts          # 粘贴板types定义
└── paste-configuration.d.ts          # 粘贴板types公共定义
└── constants.ts          # 全局常量，前后端公用

```

## 编码要求

1. 该项目为轻量项目，在思考架构方案时，需要设计，但是不要过度设计。
2. 遵循前端开发规范，尽量使用版本特性编写代码，组件复用，避免重复代码。
3. 编码前可按需使用 context7 阅读官方文档，以最佳实践完成编码
