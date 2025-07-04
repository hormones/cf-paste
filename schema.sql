-- CloudFlare D1 Database
-- Keyword Table
DROP TABLE IF EXISTS keyword;

CREATE TABLE
    keyword (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT UNIQUE NOT NULL, -- 关键词
        password TEXT, -- 密码
        view_word TEXT UNIQUE NOT NULL, -- 只读关键词，随机数
        view_count INTEGER DEFAULT 0, -- 总访问次数
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP, -- 创建时间
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP, -- 最后一次更新时间
        expire_time DATETIME NOT NULL, -- 实际的过期时间
        expire_value INTEGER DEFAULT 259200, -- 用户选择的过期时长（秒），默认3天
        last_view_time DATETIME -- 最后一次查看时间
    );

-- 添加自动更新 update_time 的触发器
CREATE TRIGGER IF NOT EXISTS update_keyword_timestamp
AFTER UPDATE ON keyword
FOR EACH ROW
BEGIN
    UPDATE keyword SET update_time = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
