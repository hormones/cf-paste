# cf-paste

Cloudflare全家桶打造的在线匿名剪切板，无需注册登录，即开即用

## 功能

- 支持文本
- 支持上传文件，支持任意格式，最多上传10个文件，总大小100MB内
- 支持密码保护
- 可以自定义有效时间，过期后自动删除，可选：1小时、1天、1周、1个月、3个月、半年、1年、2年

## 使用方式

1. 使用随机word

   输入网址`https://www.example.com`，会自动调转到随机关键字：`https://paste.cf.moe/xxx`，这个xxx是生成的唯一随机word。

2. 使用自定义word

   输入网址`https://www.example.com/yyy`，这个`yyy`则是自定义的关键字，自定义关键字规则要求：大于等于3个字符，小于等于20个字符，只能包含字母、数字、下划线

## 本地开发

1. 环境配置
   Node版本要求20+

````bash
# 安装wrangler
npm install -g wrangler
# 登录，按提示操作
npx wrangler login
# 新建本地D1数据库
npx wrangler d1 create cf-paste
# 初始化本地数据库
npx wrangler d1 execute cf-paste --local --file=./schema.sql
# 新建本地R2存储
npx wrangler r2 bucket create cf-paste
# 拉取项目
git clone https://github.com/cf-paste/cf-paste.git
# 安装依赖
cd cf-paste && npm install
# 在项目根目录下新建wrangler.toml，内容如下
name = "cf-paste"
compatibility_date = "2024-12-22"
compatibility_flags = ["nodejs_compat"]
[[d1_databases]]
binding = "DB"
database_name = "cf-paste"
database_id = "xxxxxxxxxxxxxxxxxxxxxxxxxx"
[[r2_buckets]]
binding = "CF_PASTE"
bucket_name = "cf-paste"

# 最后启动开发环境
npm run preview
```
