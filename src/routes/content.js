import { Router } from "express";
import { one, query } from "../db.js";

const router = Router();

/**
 * GET /api/content
 * 公开接口，返回站点全部内容（不含未发布作品）
 */
router.get("/", async (_req, res) => {
  try {
    const settings = await one("SELECT hero, about, contact, skills, flow, site_meta FROM site_settings WHERE id = 1");
    const { rows } = await query(
      "SELECT id, title, description, category, video_url, video_type, thumbnail, role, year, duration, badge, sort_order FROM works WHERE is_published = TRUE ORDER BY sort_order ASC, id ASC"
    );

    const result = {
      hero: settings.hero || {},
      about: settings.about || {},
      contact: settings.contact || {},
      skills: settings.skills || [],
      flow: settings.flow || [],
      site_meta: settings.site_meta || {},
      works: rows || [],
    };
    return res.json(result);
  } catch (err) {
    console.error("[content] error:", err);
    return res.status(500).json({ error: "读取内容失败" });
  }
});

export default router;
