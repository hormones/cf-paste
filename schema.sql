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

DROP TABLE IF EXISTS activity_log;
CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action INTEGER NOT NULL,    -- 操作类型，枚举：1-新建、2-修改正文、3-上传文件、4-下载文件、5-删除文件、6-访问、7-删除、99-自动过期（自动过期的ip、region等全部记录为-）
    word_id INTEGER NOT NULL,  -- keyword表数据ID
    word TEXT NOT NULL,        -- 关键词
    ip TEXT NOT NULL,          -- IP地址
    country TEXT,              -- 国家代码
    region TEXT,               -- 地区
    desc TEXT,                 -- 操作描述（文件类操作，此字段记录文件名）
    action_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 访问/修改操作，如果10分钟内相同IP地址已经存在相同的操作，则更新，新建和删除每次都记录
CREATE TRIGGER IF NOT EXISTS  upsert_activity_log
BEFORE INSERT ON activity_log
FOR EACH ROW
WHEN NEW.action IN (2,6)  -- UPDATE_CONTENT=2, VIEW=6
BEGIN
    UPDATE activity_log
    SET action_time = CURRENT_TIMESTAMP
    WHERE word_id = NEW.word_id
      AND action = NEW.action
      AND ip = NEW.ip
      AND action_time >= datetime(CURRENT_TIMESTAMP, '-10 minutes');

    SELECT RAISE(IGNORE) WHERE changes() > 0;
END;

-- Performance optimization indexes for admin queries
-- Primary index for time-based queries (most frequent in admin dashboard)
CREATE INDEX IF NOT EXISTS idx_activity_log_action_time ON activity_log(action_time);

-- Composite index for action-specific queries with time filtering
CREATE INDEX IF NOT EXISTS idx_activity_log_action_time_desc ON activity_log(action, action_time DESC);

-- Index for IP-based queries (admin can filter by IP)
CREATE INDEX IF NOT EXISTS idx_activity_log_ip ON activity_log(ip);

-- Index for keyword-based queries (admin can search by keyword)
CREATE INDEX IF NOT EXISTS idx_activity_log_word ON activity_log(word);

-- Index for location-based queries (country/region filtering)
CREATE INDEX IF NOT EXISTS idx_activity_log_country ON activity_log(country);
CREATE INDEX IF NOT EXISTS idx_activity_log_region ON activity_log(region);

-- Composite index for efficient trigger operation (word_id, action, ip, action_time)
CREATE INDEX IF NOT EXISTS idx_activity_log_trigger ON activity_log(word_id, action, ip, action_time);
