import { Router } from "express";
import bcrypt from "bcryptjs";
import { one } from "../db.js";

const router = Router();

/** POST /api/auth/login  —  { username, password } */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "请输入账号和密码" });
    }
    const user = await one("SELECT id, username, password_hash FROM admin_users WHERE username = $1", [
      String(username).trim(),
    ]);
    if (!user) return res.status(401).json({ error: "账号或密码错误" });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: "账号或密码错误" });

    // 写入会话
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.save(() => {});
    return res.json({ ok: true, username: user.username });
  } catch (err) {
    console.error("[auth] login error:", err);
    return res.status(500).json({ error: "服务器错误" });
  }
});

/** POST /api/auth/logout */
router.post("/logout", (req, res) => {
  req.session.destroy(() => {});
  res.clearCookie("connect.sid");
  return res.json({ ok: true });
});

/** GET /api/auth/me — 当前登录状态 */
router.get("/me", (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  return res.json({ loggedIn: false });
});

export default router;

