import dotenv from "dotenv";
import { pool } from "./db.js";
import { ensureDatabase } from "./setup.js";

dotenv.config();

ensureDatabase({ log: true })
  .then(async () => {
    console.log("[seed] ✓ 完成（幂等，仅空库时写入）");
    await pool.end();
  })
  .catch((err) => {
    console.error("[seed] 失败:", err.message);
    process.exit(1);
  });
