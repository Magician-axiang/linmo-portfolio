import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "schema.sql");

async function initDb() {
  const sql = readFileSync(schemaPath, "utf8");
  console.log("[db] 正在执行 schema.sql ...");
  await pool.query(sql);
  console.log("[db] ✓ 表结构已就绪。");
  await pool.end();
}

initDb().catch((err) => {
  console.error("[db] 初始化失败:", err);
  process.exit(1);
});
