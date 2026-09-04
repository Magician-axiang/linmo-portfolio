/* 管理后台 — 登录页逻辑 */

(async function () {
  "use strict";

  // 已登录直接跳转
  try {
    const r = await fetch("/api/auth/me");
    const d = await r.json();
    if (d.loggedIn) location.href = "/admin";
  } catch (_) {}

  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMsg");
  const btn = document.getElementById("loginBtn");
  const text = btn.querySelector(".l-submit-text");
  const spinner = btn.querySelector(".l-spinner");

  // 显示/隐藏密码
  const pw = document.getElementById("pwInput");
  const toggle = document.getElementById("togglePw");
  toggle.addEventListener("click", () => {
    const isPw = pw.type === "password";
    pw.type = isPw ? "text" : "password";
    toggle.classList.toggle("on", isPw);
  });

  function showMsg(t, isErr) {
    msg.textContent = t;
    msg.classList.remove("hidden");
    msg.classList.toggle("err", !!isErr);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const username = (data.get("username") || "").trim();
    const password = data.get("password") || "";
    if (!username || !password) return showMsg("请输入账号和密码", true);

    btn.disabled = true;
    text.textContent = "登录中…";
    spinner.classList.remove("hidden");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "登录失败");
      location.href = "/admin";
    } catch (err) {
      showMsg(err.message, true);
      btn.disabled = false;
      text.textContent = "登录";
      spinner.classList.add("hidden");
    }
  });
})();

