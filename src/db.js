import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db] 未配置 DATABASE_URL，请在 .env 中设置。");
}

// 自动适配 SSL：显式 PG_SSL=require 时启用；Supabase/Neon 链接也常见需要
const ssl =
  process.env.PG_SSL === "require"
    ? { rejectUnauthorized: false }
    : /sslmode=require/i.test(connectionString || "")
      ? { rejectUnauthorized: false }
      : undefined;

export const pool = new Pool({
  connectionString,
  ssl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[db] 连接池错误:", err.message);
});

/** 执行参数化查询，返回 result */
export const query = (text, params) => pool.query(text, params);

/** 取单行 */
export const one = async (text, params) => {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
};

