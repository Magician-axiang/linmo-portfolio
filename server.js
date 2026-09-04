import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

import authRouter from "./src/routes/auth.js";
import contentRouter from "./src/routes/content.js";
import adminRouter from "./src/routes/admin.js";
import { pool } from "./src/db.js";
import { ensureDatabase } from "./src/setup.js";

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

/* 信任反向代理（Render/Cloudflare 都需要），
   否则 express-session 的 secure cookie 不会下发 */
app.set("trust proxy", 1);

/* ---------- 中间件 ---------- */
app.use(express.json({ limit: "8mb" })); // base64 缩略图可能较大
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd, // 生产 HTTPS 下启用
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 天
    },
  })
);

/* ---------- API 路由 ---------- */
app.use("/api/auth", authRouter);
app.use("/api/content", contentRouter);
app.use("/api/admin", adminRouter);

/* ---------- 健康检查 ---------- */
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, db: "error", error: e.message });
  }
});

/* ---------- 静态资源 ----------
   /          → 公开首页 (public/)
   /admin     → 管理后台 (admin/)
*/
app.use(express.static(join(__dirname, "public")));
app.use("/admin", express.static(join(__dirname, "admin")));

/* ---------- 上传文件（视频等）静态服务 ----------
   express.static 原生支持 Range 请求，可拖拽进度条跳播；
   云端需挂载持久磁盘，否则重启后文件丢失（见 README）。 */
const UPLOADS_DIR = join(__dirname, "uploads");
mkdirSync(join(UPLOADS_DIR, "videos"), { recursive: true });
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    maxAge: "7d",
    setHeaders: (res) => res.setHeader("Accept-Ranges", "bytes"),
  })
);

/* ---------- SPA 兜底（admin 刷新不 404） ---------- */
app.get(/^\/admin(\/.*)?$/, (_req, res) => {
  res.sendFile(join(__dirname, "admin", "dashboard.html"));
});

// 根路径兜底给首页
app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

function listen() {
  app.listen(PORT, () => {
    console.log(`\n────────────────────────────────────────`);
    console.log(`  林墨作品集 CMS 已启动`);
    console.log(`  公开首页:  http://localhost:${PORT}`);
    console.log(`  管理后台:  http://localhost:${PORT}/admin`);
    console.log(`  健康检查:  http://localhost:${PORT}/api/health`);
    console.log(`  环境:      ${isProd ? "production" : "development"}`);
    console.log(`────────────────────────────────────────\n`);
  });
}

/* ---------- 启动前自动初始化数据库（幂等，安全） ----------
   建表 + 仅空库时写入初始数据，绝不覆盖后台已编辑内容。
   云端部署无需再手动跑 db:init / seed。 */
ensureDatabase({ log: true })
  .then(() => {
    console.log("[startup] ✓ 数据库已就绪");
    listen();
  })
  .catch((err) => {
    console.error("[startup] 数据库初始化失败:", err.message);
    console.error("[startup] 服务仍将启动以便通过 /api/health 排查。请检查 DATABASE_URL。");
    listen();
  });
