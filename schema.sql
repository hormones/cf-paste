-- CloudFlare D1 Database
-- Keyword Table
DROP TABLE IF EXISTS keyword;

CREATE TABLE
    keyword (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL, -- 关键词
        password TEXT, -- 密码
        files_size INTEGER DEFAULT 0, -- 已上传的文件总大小，单位B
        expire_time DATETIME NOT NULL, -- 过期时间
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP -- 创建时间
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP -- 最后一次更新时间
        random_key TEXT NOT NULL, -- 只读关键词，随机数
        last_view_time DATETIME -- 最后一次查看时间
        view_count INTEGER DEFAULT 0 -- 总访问次数
    );