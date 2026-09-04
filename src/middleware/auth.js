/** 要求登录，否则返回 401 */
export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: "未登录或会话已过期，请重新登录。" });
}
