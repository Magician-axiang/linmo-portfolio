import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bcrypt from "bcryptjs";
import { query } from "./db.js";
import { initialSettings, initialWorks } from "./seed-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "schema.sql");

/**
 * 幂等初始化：建表 + 仅在为空时写入初始管理员 / 站点配置 / 作品。
 * 服务每次启动都会调用，安全 —— 不会覆盖你在后台已编辑的数据。
 */
export async function ensureDatabase({ log = true } = {}) {
  // 1. 建表（CREATE TABLE IF NOT EXISTS，幂等）
  const sql = readFileSync(schemaPath, "utf8");
  await query(sql);
  if (log) console.log("[setup] ✓ 表结构就绪");

  // 2. 管理员（仅当不存在时创建）
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123456";
  const aExists = await query("SELECT id FROM admin_users WHERE username = $1", [adminUser]);
  if (aExists.rowCount === 0) {
    const hash = await bcrypt.hash(adminPass, 10);
    await query("INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)", [adminUser, hash]);
    if (log) console.log(`[setup] ✓ 创建管理员: ${adminUser}`);
  }

  // 3. 站点配置（仅当 hero 为空 → 尚未配置过）
  const s = await query("SELECT (hero)::text AS hero FROM site_settings WHERE id = 1");
  const empty = !s.rowCount || !s.rows[0].hero || s.rows[0].hero === "{}";
  if (empty) {
    await query(
      `UPDATE site_settings SET
        hero=$1::jsonb, about=$2::jsonb, contact=$3::jsonb,
        skills=$4::jsonb, flow=$5::jsonb, site_meta=$6::jsonb, updated_at=NOW()
       WHERE id=1`,
      [
        JSON.stringify(initialSettings.hero),
        JSON.stringify(initialSettings.about),
        JSON.stringify(initialSettings.contact),
        JSON.stringify(initialSettings.skills),
        JSON.stringify(initialSettings.flow),
        JSON.stringify(initialSettings.site_meta),
      ]
    );
    if (log) console.log("[setup] ✓ 写入初始站点配置");
  }

  // 4. 作品（仅当表为空时写入示例）
  const wc = await query("SELECT COUNT(*)::int AS n FROM works");
  if (wc.rows[0].n === 0) {
    for (const w of initialWorks) {
      await query(
        `INSERT INTO works
          (title, description, category, video_url, video_type, thumbnail, role, year, duration, badge, sort_order, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)`,
        [w.title, w.description, w.category, w.video_url, w.video_type,
         w.thumbnail, w.role, w.year, w.duration, w.badge, w.sort_order]
      );
    }
    if (log) console.log(`[setup] ✓ 写入 ${initialWorks.length} 条示例作品`);
  }
}
