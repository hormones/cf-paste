# CF-PASTE

<p align="center">English | <a href="README_zh-cn.md">中文文档</a></p>

**A multi-platform anonymous clipboard with unified architecture. Supports Cloudflare Workers and Node.js self-hosting. No registration required, ready to use instantly.**

<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.x-green" alt="Vue.js 3.x">
  <img src="https://img.shields.io/badge/TypeScript-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-orange" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/Node.js-green" alt="Node.js">
  <img src="https://img.shields.io/badge/storage-R2-blue" alt="Cloudflare R2">
  <img src="https://img.shields.io/badge/database-D1-blue" alt="Cloudflare D1">
  <img src="https://img.shields.io/github/license/hormones/cf-paste" alt="License">
</p>

## ✨ Features

- [x] **Multi-Platform Support**: Deploy on Cloudflare Workers or self-host with Node.js
- [x] **Unified Architecture**: Platform-agnostic business logic with adapter pattern
- [x] **Large File Upload**: Bypass Cloudflare Workers' 100MB upload limit with chunked uploads
- [x] **Multi-format Support**: Share both text and files
- [x] **Batch Upload**: Support up to 10 files with total size under 300MB (configurable)
- [x] **Anonymous Sharing**: No registration or login required, privacy protected
- [x] **Password Protection**: Set access passwords for shared content
- [x] **Custom Expiration**: Automatic deletion after expiration, options from 1 hour to 2 years
- [x] **Multi-language Support**: Support Chinese and English with automatic detection
- [x] **Markdown Support**: Support Markdown with real-time preview, code syntax highlighting, flowchart rendering
- [x] **Scheduled Cleanup**: Automatic cleanup of expired content
- [ ] **File Preview**: Support file preview

## 🚀 Live Demo

[https://cf-paste.a-e8c.workers.dev](https://cf-paste.a-e8c.workers.dev)

## 🛠️ Usage

1.  **Random Mode**
    Visit the homepage `https://www.example.com`, the system will automatically redirect to a randomly generated unique address like `https://www.example.com/xxxx`.

2.  **Custom Mode**
    Directly enter `https://www.example.com/your_word` in the browser address bar, where `your_word` is your custom keyword.

    > **Custom Keyword Rules**: 4-20 characters long, containing only letters, numbers, and underscores.

## 🏗️ Architecture

CF-PASTE uses a unified architecture that separates business logic from platform implementation:

- **Business Layer**: Platform-agnostic API handlers and business logic
- **Adapter Layer**: Platform-specific implementations (Cloudflare Workers, Node.js)
- **Platform Layer**: Infrastructure and runtime environments

This design enables:
- **Multi-platform deployment** without code changes
- **Easy third-party platform integration** by implementing adapters
- **Consistent API behavior** across different platforms
- **Maintainable codebase** with clear separation of concerns

## ⚙️ Deployment Guide

**Requirements**: Node.js >= 20.x

### 1. Clone Repository

```bash
git clone git@github.com:hormones/cf-paste.git
cd cf-paste && npm install
```

### 2. Choose Deployment Platform

#### Option A: Cloudflare Workers (Recommended)

**2.1 Login to Cloudflare**
```bash
npx wrangler login
```

**2.2 Initialize Cloudflare Services**
```bash
# Create D1 database (note down the database_id)
npx wrangler d1 create cf-paste

# Create R2 bucket
npx wrangler r2 bucket create cf-paste
```

**2.3 Configure `wrangler.jsonc`**
Copy `wrangler.example.jsonc` and rename it to `wrangler.jsonc`. Update:
- `database_id` from step 2.2
- `AUTH_KEY` (random string, ~16 characters)
- `LANGUAGE` (auto/en/zh-CN)

**2.4 Deploy**
```bash
# Production deployment
npm run deploy:cf

# Development mode
npm run dev:cf
```

#### Option B: Node.js Self-Hosted

**2.1 Configure Environment**
```bash
# Copy environment template
cp env.example .env

# Edit .env with your settings
# - AUTH_KEY: Random string for authentication
# - DB_PATH: SQLite database path
# - STORAGE_PATH: File storage directory
# - PORT: Server port (default: 3000)
```

**2.2 Deploy**
```bash
# Production deployment
npm run deploy:self

# Development mode with hot reload
npm run dev:self
```

### 3. Database Setup

**Cloudflare Workers:**
```bash
# Apply schema to remote database
npx wrangler d1 execute cf-paste --remote --file=./schema.sql
```

**Node.js Self-Hosted:**
The SQLite database will be created automatically on first run.

## 🛠️ Development

### Project Structure
```
server/
├── api/           # Business logic (data, file, pass operations)
├── middleware/    # Authentication and middleware
├── platforms/     # Platform adapters (cloudflare, self-hosted)
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── router.ts      # Unified routing system
├── app.worker.ts  # Cloudflare Workers entry point
└── app.self.ts    # Node.js self-hosted entry point
```

### Key Scripts
- `npm run dev:cf` - Cloudflare Workers development
- `npm run dev:self` - Node.js self-hosted development
- `npm run deploy:cf` - Deploy to Cloudflare Workers
- `npm run deploy:self` - Deploy Node.js self-hosted
- `npm run cf-typegen` - Generate Cloudflare Workers types

## 🙏 Reference Documentation

- [Vue 3 Documentation](https://vuejs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Express.js Documentation](https://expressjs.com/)
- [MD-EDITOR-V3 Documentation](https://github.com/imzbf/md-editor-v3)
