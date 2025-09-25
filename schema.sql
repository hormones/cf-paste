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

CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action INTEGER NOT NULL,    -- 操作类型 1-新建/2-修改/3-删除/4-访问/5-自动过期（自动过期的ip、region等全部记录为-）
    word_id INTEGER NOT NULL,  -- keyword表数据ID
    word INTEGER NOT NULL,    -- 关键词
    ip TEXT NOT NULL,          -- IP地址
    country TEXT,              -- 国家代码
    region TEXT,              -- 地区
    action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
);

-- 访问/修改操作，如果10分钟内相同IP地址已经存在相同的操作，则更新，新建和删除每次都记录
CREATE TRIGGER upsert_activity_log
BEFORE INSERT ON activity_log
FOR EACH ROW
WHEN NEW.action IN (2,4)
BEGIN
    UPDATE activity_log
    SET action_time = CURRENT_TIMESTAMP
    WHERE word_id = NEW.word_id
      AND action = NEW.action
      AND ip = NEW.ip
      AND action_time >= datetime(CURRENT_TIMESTAMP, '-10 minutes');

    SELECT RAISE(IGNORE) WHERE changes() > 0;
END;
