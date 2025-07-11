# CF-PASTE

<p align="center">English | <a href="README_zh-cn.md">中文文档</a></p>

**An online anonymous clipboard built with the Cloudflare stack. No registration required, ready to use instantly.**

<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.x-green" alt="Vue.js 3.x">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-orange" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/storage-R2-blue" alt="Cloudflare R2">
  <img src="https://img.shields.io/badge/database-D1-blue" alt="Cloudflare D1">
  <img src="https://img.shields.io/github/license/hormones/cf-paste" alt="License">
</p>

## ✨ Features

- [x] **Large File Upload**: Bypass Cloudflare Workers' 100MB upload limit.
- [x] **Multi-format Support**: Share both text and files.
- [x] **Batch Upload**: Support up to 10 files with total size under 300MB (configurable).
- [x] **Anonymous Sharing**: No registration or login required, privacy protected.
- [x] **Password Protection**: Set access passwords for shared content.
- [x] **Custom Expiration**: Automatic deletion after expiration, options from 1 hour to 2 years.
- [x] **Multi-language Support**: Support Chinese and English.
- [x] **Markdown Support**: Support Markdown, support **real-time preview**, code syntax highlighting, flowchart rendering, etc.
- [ ] **File Preview**: Support file preview.

## 🚀 Live Demo

[https://cf-paste.a-e8c.workers.dev](https://cf-paste.a-e8c.workers.dev)

## 🛠️ Usage

1.  **Random Mode**
    Visit the homepage `https://www.example.com`, the system will automatically redirect to a randomly generated unique address like `https://www.example.com/xxxx`.

2.  **Custom Mode**
    Directly enter `https://www.example.com/your_word` in the browser address bar, where `your_word` is your custom keyword.

    > **Custom Keyword Rules**: 4-20 characters long, containing only letters, numbers, and underscores.

## ⚙️ Deployment Guide

    Requirements: Node.js >= 20.x

1.  **Clone Repository**

    ```bash
    git clone git@github.com:hormones/cf-paste.git
    cd cf-paste && npm install
    ```

2.  **Login to Cloudflare**

    ```bash
    npx wrangler login
    ```

3.  **Initialize Cloudflare D1 and R2**

    ```bash
    # Create D1 database (note down the database_id)
    npx wrangler d1 create cf-paste

    # Create R2 bucket
    npx wrangler r2 bucket create cf-paste
    ```

4.  **Configure `wrangler.jsonc`**

    Copy `wrangler.example.jsonc` and rename it to `wrangler.jsonc`. Follow the comments in the file to fill in the necessary configuration items, especially `database_id`, `AUTH_KEY` and `LANGUAGE`.

5.  **Deploy**

    - **Production Environment**

      ```bash
      # Apply schema.sql to remote database
      npx wrangler d1 execute cf-paste --remote --file=./schema.sql
      # Deploy to Cloudflare
      npm run deploy
      ```

    - **Local Development**
      ```bash
      # Apply schema.sql to local database
      npx wrangler d1 execute cf-paste --local --file=./schema.sql
      # Start local development server
      npm run preview
      ```

## 🙏 Reference Documentation

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vue 3 Documentation](https://vuejs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
