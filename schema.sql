-- =========================================================
-- 林墨作品集 CMS — 数据库结构
-- =========================================================

-- 管理员账号
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 站点单行配置（hero / about / contact / skills / flow 等以 JSONB 存储）
CREATE TABLE IF NOT EXISTS site_settings (
  id         INT PRIMARY KEY DEFAULT 1,
  hero       JSONB NOT NULL DEFAULT '{}'::jsonb,
  about      JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact    JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills     JSONB NOT NULL DEFAULT '[]'::jsonb,
  flow       JSONB NOT NULL DEFAULT '[]'::jsonb,
  site_meta  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 作品案例（独立表，便于增删改与排序）
CREATE TABLE IF NOT EXISTS works (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  video_url    TEXT,
  video_type   TEXT DEFAULT 'youtube',
  thumbnail    TEXT,
  role         TEXT,
  year         TEXT,
  duration     TEXT,
  badge        TEXT,
  sort_order   INT  NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_works_sort ON works (sort_order);
CREATE INDEX IF NOT EXISTS idx_works_published ON works (is_published);
