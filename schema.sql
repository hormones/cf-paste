-- SQLite Database
CREATE TABLE IF NOT EXISTS keyword
(
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    word           TEXT UNIQUE NOT NULL,               -- Keyword
    password       TEXT,                               -- Password
    view_word      TEXT UNIQUE NOT NULL,               -- Read-only keyword generated from a random value
    view_count     INTEGER  DEFAULT 0,                 -- Total number of visits
    create_time    DATETIME DEFAULT CURRENT_TIMESTAMP, -- Creation time
    update_time    DATETIME DEFAULT CURRENT_TIMESTAMP, -- Most recent update time
    expire_time    DATETIME    NOT NULL,               -- Actual expiration timestamp
    expire_value   INTEGER  DEFAULT 259200,            -- User-selected expiration duration (seconds), default 3 days
    last_view_time DATETIME                            -- Most recent view time
);

CREATE TRIGGER IF NOT EXISTS update_keyword_timestamp
AFTER UPDATE ON keyword
FOR EACH ROW
BEGIN
    UPDATE keyword SET update_time = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS activity_log
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action  INTEGER NOT NULL, -- Operation type: 1-create, 2-update content, 3-upload file, 4-download file, 5-delete file, 6-view, 7-delete record, 99-auto expire (auto-expired IP/region recorded as '-')
    word_id INTEGER NOT NULL, -- keyword table record ID
    word    TEXT    NOT NULL, -- Keyword
    ip      TEXT    NOT NULL, -- IP address
    country TEXT,             -- Country code
    region  TEXT,             -- Region
    desc    TEXT,             -- Operation description (records filename for file actions)
    action_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Access/modification operations, if the same operation already exists for the same IP address within 10 minutes,
-- updates, new creations and deletions will be recorded every time
CREATE TRIGGER IF NOT EXISTS upsert_activity_log
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
-- Index for IP-based queries (admin can filter by IP)
CREATE INDEX IF NOT EXISTS idx_activity_log_ip ON activity_log(ip);

-- Index for keyword-based queries (admin can search by keyword)
CREATE INDEX IF NOT EXISTS idx_activity_log_word ON activity_log(word);

-- Index for location-based queries (country/region filtering)
CREATE INDEX IF NOT EXISTS idx_activity_log_country ON activity_log(country);
CREATE INDEX IF NOT EXISTS idx_activity_log_region ON activity_log(region);

-- Composite index for efficient trigger operation (word_id, action, ip, action_time)
CREATE INDEX IF NOT EXISTS idx_activity_log_trigger ON activity_log(word_id, action, ip, action_time);
