# CF-PASTE

<p align="center">中文文档 | <a href="README.md">English</a></p>

**一个基于 Cloudflare 全家桶构建的在线匿名剪贴板，无需注册，即开即用。**

<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.x-green" alt="Vue.js 3.x">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-orange" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/storage-R2-blue" alt="Cloudflare R2">
  <img src="https://img.shields.io/badge/database-D1-blue" alt="Cloudflare D1">
  <img src="https://img.shields.io/github/license/hormones/cf-paste" alt="License">
</p>

## ✨ 功能特性

- [x] **大文件上传**：突破 Cloudflare Workers 的 100MB 上传限制。
- [x] **多格式支持**：支持分享文本和文件。
- [x] **批量上传**：支持最多 10 个文件，总大小不超过 300MB（可通过修改配置调整）。
- [x] **匿名分享**：无需注册登录，保护隐私。
- [x] **密码保护**：为分享内容设置访问密码。
- [x] **自定义有效期**：过期后自动删除，可选 1 小时到 2 年等多个时间段。
- [x] **多语言支持**：支持中文和英文。
- [x] **Markdown 支持**：支持 Markdown。
- [ ] **文件预览**：支持文件预览。

## 🚀 在线演示

[https://cf-paste.a-e8c.workers.dev](https://cf-paste.a-e8c.workers.dev)

## 🛠️ 使用方式

1.  **随机模式**
    访问网站主页 `https://www.example.com`，系统会自动跳转至一个随机生成的唯一地址，如 `https://www.example.com/xxxx`。

2.  **自定义模式**
    直接在浏览器地址栏输入 `https://www.example.com/your_word`，`your_word` 即为您的自定义关键字。

    > **自定义关键字规则**：长度为 4-20 个字符，且只能包含字母、数字和下划线。

## ⚙️ 部署指南

    环境要求：Node.js >= 20.x

1.  **克隆仓库**

    ```bash
    git clone git@github.com:hormones/cf-paste.git
    cd cf-paste && npm install
    ```

2.  **登录 Cloudflare**

    ```bash
    npx wrangler login
    ```

3.  **初始化 Cloudflare D1 和 R2**

    ```bash
    # 创建 D1 数据库 (记下 database_id)
    npx wrangler d1 create cf-paste

    # 创建 R2 存储桶
    npx wrangler r2 bucket create cf-paste
    ```

4.  **配置 `wrangler.jsonc`**

    复制 `wrangler.example.jsonc` 并重命名为 `wrangler.jsonc`。根据文件内的注释提示，填写必要的配置项，特别是 `database_id` 、 `AUTH_KEY` 和 `LANGUAGE`。

5.  **部署**

    - **生产环境**

      ```bash
      # 将 schema.sql 应用到远程数据库
      npx wrangler d1 execute cf-paste --remote --file=./schema.sql
      # 部署到 Cloudflare
      npm run deploy
      ```

    - **本地开发**
      ```bash
      # 将 schema.sql 应用到本地数据库
      npx wrangler d1 execute cf-paste --local --file=./schema.sql
      # 启动本地开发服务器
      npm run preview
      ```

## 🙏 参考文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
