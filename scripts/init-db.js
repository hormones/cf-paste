import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保data目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 数据库路径
const dbPath = path.join(dataDir, 'database.sqlite');

console.log('Initializing database at:', dbPath);

// 创建数据库连接
const db = new Database(dbPath);

// 读取schema.sql文件
const schemaPath = path.join(__dirname, '..', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// 执行schema
db.exec(schema);

console.log('Database initialized successfully!');

// 关闭数据库连接
db.close();
