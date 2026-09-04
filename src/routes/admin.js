import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { one, query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** 全部 admin 路由均需登录 */
router.use(requireAuth);

/* ---------- 视频文件存储目录 ----------
   存到项目根目录下的 uploads/videos/，通过 /uploads 静态服务（支持 Range 拖拽）。
   云端需挂载持久磁盘（见 README），否则重启后上传文件会丢失。 */
const UPLOADS_DIR = join(process.cwd(), "uploads", "videos");
mkdirSync(UPLOADS_DIR, { recursive: true });
const MAX_VIDEO_SIZE = Number(process.env.MAX_VIDEO_SIZE_MB || 200) * 1024 * 1024;

/* ---------- 通用：更新 site_settings 的某个 JSONB 列 ---------- */
async function updateSection(column, value) {
  await query(
    `UPDATE site_settings SET ${column} = $1::jsonb, updated_at = NOW() WHERE id = 1`,
    [JSON.stringify(value)]
  );
}

/* ---------- 站点配置 ---------- */

/** GET /api/admin/settings — 全部配置 + 作品 */
router.get("/settings", async (_req, res) => {
  try {
    const settings = await one(
      "SELECT hero, about, contact, skills, flow, site_meta FROM site_settings WHERE id = 1"
    );
    const { rows } = await query(
      "SELECT * FROM works ORDER BY sort_order ASC, id ASC"
    );
    return res.json({ ...settings, works: rows });
  } catch (err) {
    console.error("[admin] get settings:", err);
    return res.status(500).json({ error: "读取失败" });
  }
});

const SECTIONS = ["hero", "about", "contact", "skills", "flow", "site_meta"];
const sectionRoute = (col) =>
  router.put(`/${col}`, async (req, res) => {
    try {
      const value = req.body;
      if (value === undefined || value === null) {
        return res.status(400).json({ error: "请求体为空" });
      }
      await updateSection(col, value);
      return res.json({ ok: true });
    } catch (err) {
      console.error(`[admin] update ${col}:`, err);
      return res.status(500).json({ error: "保存失败" });
    }
  });
SECTIONS.forEach((col) => sectionRoute(col));

/* ---------- 作品 CRUD ---------- */

/** GET /api/admin/works — 全部作品（含未发布） */
router.get("/works", async (_req, res) => {
  try {
    const { rows } = await query("SELECT * FROM works ORDER BY sort_order ASC, id ASC");
    return res.json(rows);
  } catch (err) {
    console.error("[admin] list works:", err);
    return res.status(500).json({ error: "读取失败" });
  }
});

/** POST /api/admin/works — 新建 */
router.post("/works", async (req, res) => {
  try {
    const w = req.body || {};
    if (!w.title || !String(w.title).trim()) {
      return res.status(400).json({ error: "标题不能为空" });
    }
    const result = await one(
      `INSERT INTO works
        (title, description, category, video_url, video_type, thumbnail, role, year, duration, badge, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        w.title, w.description || "", w.category || "", w.video_url || "",
        w.video_type || "youtube", w.thumbnail || "", w.role || "",
        w.year || "", w.duration || "", w.badge || "",
        Number(w.sort_order) || 0,
        w.is_published === false ? false : true,
      ]
    );
    return res.status(201).json(result);
  } catch (err) {
    console.error("[admin] create work:", err);
    return res.status(500).json({ error: "创建失败" });
  }
});

/** PUT /api/admin/works/:id — 更新 */
router.put("/works/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const w = req.body || {};
    const existing = await one("SELECT * FROM works WHERE id = $1", [id]);
    if (!existing) return res.status(404).json({ error: "作品不存在" });

    const merged = { ...existing, ...w };
    const updated = await one(
      `UPDATE works SET
        title=$1, description=$2, category=$3, video_url=$4, video_type=$5,
        thumbnail=$6, role=$7, year=$8, duration=$9, badge=$10,
        sort_order=$11, is_published=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [
        merged.title, merged.description, merged.category, merged.video_url,
        merged.video_type, merged.thumbnail, merged.role, merged.year,
        merged.duration, merged.badge, Number(merged.sort_order) || 0,
        merged.is_published === false ? false : true, id,
      ]
    );
    return res.json(updated);
  } catch (err) {
    console.error("[admin] update work:", err);
    return res.status(500).json({ error: "更新失败" });
  }
});

/** DELETE /api/admin/works/:id */
router.delete("/works/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM works WHERE id = $1", [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[admin] delete work:", err);
    return res.status(500).json({ error: "删除失败" });
  }
});

/** PUT /api/admin/works/reorder — 批量更新排序 { ids: [3,1,2] } */
router.put("/works/reorder", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
    for (let i = 0; i < ids.length; i++) {
      await query("UPDATE works SET sort_order = $1 WHERE id = $2", [i, ids[i]]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[admin] reorder:", err);
    return res.status(500).json({ error: "排序失败" });
  }
});

/* ---------- 图片上传（缩略图 / 头像） ----------
   内存存储 → base64 data URL，写入 DB，无需对象存储 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error("仅支持图片文件"));
  },
});

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "未接收到文件" });
  const b64 = req.file.buffer.toString("base64");
  const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
  return res.json({ url: dataUrl, size: req.file.size });
});

/* ---------- 视频文件上传 ----------
   磁盘存储，文件名 = 时间戳-随机串 + 原扩展名（经清洗），
   避免覆盖、中文路径与目录穿越。通过 /uploads 静态服务，支持 Range 拖拽播放。 */
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const rawExt = extname(file.originalname || "").toLowerCase().replace(/[^.\w]/g, "");
    const ext =
      rawExt ||
      (file.mimetype === "video/webm" ? ".webm" : file.mimetype === "video/ogg" ? ".ogg" : ".mp4");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (/^video\//.test(file.mimetype)) return cb(null, true);
    cb(new Error("仅支持视频文件（mp4 / webm 等）"));
  },
});

/** POST /api/admin/upload-video — { url, filename, size, mimetype } */
router.post("/upload-video", videoUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "未接收到文件" });
  return res.json({
    url: `/uploads/videos/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// multer 错误处理（图片 5MB / 视频 MAX_VIDEO_SIZE 分别提示）
router.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const isVideo = /upload-video/.test(req.originalUrl || "");
      const limit = isVideo ? `${Math.round(MAX_VIDEO_SIZE / 1024 / 1024)}MB` : "5MB";
      return res.status(400).json({ error: `文件过大（上限 ${limit}）` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
});

/* ---------- 修改密码 ---------- */
router.put("/password", async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "新密码至少 6 位" });
    }
    const user = await one("SELECT password_hash FROM admin_users WHERE id = $1", [
      req.session.userId,
    ]);
    if (!user) return res.status(404).json({ error: "账号不存在" });

    const ok = await bcrypt.compare(String(oldPassword || ""), user.password_hash);
    if (!ok) return res.status(401).json({ error: "原密码错误" });

    const hash = await bcrypt.hash(String(newPassword), 10);
    await query("UPDATE admin_users SET password_hash = $1 WHERE id = $2", [
      hash,
      req.session.userId,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[admin] password:", err);
    return res.status(500).json({ error: "修改失败" });
  }
});

export default router;
