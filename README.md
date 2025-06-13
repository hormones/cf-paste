# cf-paste

Cloudflare全家桶打造的在线匿名剪贴板，无需注册登录，即开即用

项目架构概览：

前端: Vue 3 + TypeScript + Element Plus + Vite

后端: Cloudflare Workers

数据库: Cloudflare D1

存储: Cloudflare R2

路由: itty-router

## 功能

- 支持文本
- 支持上传文件，支持任意格式，最多上传10个文件，总大小100MB内
- 支持密码保护
- 自定义有效时间，过期后自动删除，可选：1小时、1天、1周、1个月、3个月、半年、1年、2年

## TODO

- [ ] 支持Markdown
- [ ] 支持文件预览

## DEMO

https://cf-paste.a-e8c.workers.dev

## 使用方式

1. 使用随机word

   输入网址`https://www.example.com`，会自动调转到随机关键字：`https://www.example.com/xxxx`，这个xxxx是生成的唯一随机word。

2. 使用自定义word

   输入网址`https://www.example.com/yyyy`，这个`yyyy`则是自定义的关键字，区分大小写，自定义关键字规则要求：大于等于4个字符，小于等于20个字符，只能包含字母、数字、下划线

## 生产部署

Node版本要求20+

1. 克隆仓库

```bash
git clone git@github.com:hormones/cf-paste.git
cd cf-paste && npm install
```

2. 登录 Cloudflare

```bash
npx wrangler login
```

3. 初始化D1和R2存储

```bash
# 初始化 D1 数据库，记下输出的数据库ID
npx wrangler d1 create cf-paste
npx wrangler d1 execute cf-paste --remote --file=./schema.sql
# 初始化R2 储存
npx wrangler r2 bucket create cf-paste
```

4. 新建`wrangler.jsonc`

复制`wrangler.example.jsonc`文件为`wrangler.jsonc`，按提示填写配置，一般来说只需要修改database_id和AUTH_KEY，其它参数不要动

5. 部署

```bash
npm run deploy
```

## 本地开发部署

Node版本要求20+

1. 克隆仓库

```bash
git clone git@github.com:hormones/cf-paste.git
cd cf-paste && npm install
```

2. 登录 Cloudflare

```bash
npx wrangler login
```

3. 初始化D1和R2存储

```bash
# 初始化 D1 数据库，记下输出的数据库ID
npx wrangler d1 create cf-paste
npx wrangler d1 execute cf-paste --local --file=./schema.sql
# 初始化R2 储存
npx wrangler r2 bucket create cf-paste
```

4. 新建`wrangler.jsonc`

复制`wrangler.example.jsonc`文件为`wrangler.jsonc`，按提示填写配置，一般来说只需要修改database_id和AUTH_KEY，其它参数不要动

5. 部署

```bash
npm run preview
```

## 参考资料

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
