/* =========================================================
   公开首页 — UI 交互
   由 app.js 在渲染完成后调用 Main.init()
   ========================================================= */

window.Main = (function () {
  "use strict";

  function init() {
    initNavbar();
    initMobileMenu();
    initReveal();
    initToTop();
    initVideoModal();
    initContactForm();
    initSmoothAnchor();
  }

  /* ---------- 导航滚动状态 ---------- */
  function initNavbar() {
    const navbar = document.getElementById("navbar");
    const toTop = document.getElementById("toTop");
    function onScroll() {
      const y = window.scrollY || window.pageYOffset;
      navbar.classList.toggle("scrolled", y > 24);
      toTop.classList.toggle("show", y > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ---------- 移动端菜单 ---------- */
  function initMobileMenu() {
    const btn = document.getElementById("menuBtn");
    const menu = document.getElementById("mobileMenu");
    const icon = document.getElementById("menuIcon");
    if (!btn) return;
    function toggle(force) {
      const willOpen = typeof force === "boolean" ? force : menu.classList.contains("hidden");
      if (willOpen) {
        menu.classList.remove("hidden");
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6"/>';
      } else {
        menu.classList.add("hidden");
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16"/>';
      }
    }
    btn.addEventListener("click", () => toggle());
    document.querySelectorAll(".mobile-link").forEach((a) => a.addEventListener("click", () => toggle(false)));
  }

  /* ---------- 滚动出现动画 ---------- */
  function initReveal() {
    const reveals = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            entry.target.querySelectorAll(".bar").forEach((b) => b.classList.add("animated"));
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- 视频弹窗关闭 ---------- */
  function initVideoModal() {
    const modal = document.getElementById("videoModal");
    if (!modal) return;
    modal.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", () => window.closeVideoModal && window.closeVideoModal());
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") window.closeVideoModal && window.closeVideoModal();
    });
  }

  /* ---------- 联系表单（前端演示） ---------- */
  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const msg = document.getElementById("formMsg");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const type = (data.get("type") || "").toString().trim();
      if (!name || !email) {
        showMsg("请填写姓名和邮箱，方便我联系你。", true);
        return;
      }
      showMsg(`感谢 ${name}！已收到你的「${type}」需求，我会通过 ${email} 在 24 小时内回复你。`, false);
      form.reset();
    });
    function showMsg(text, isError) {
      if (!msg) return;
      msg.textContent = text;
      msg.classList.remove("hidden");
      msg.style.borderColor = isError ? "rgba(248,113,113,.4)" : "rgba(251,191,36,.4)";
      msg.style.background = isError ? "rgba(248,113,113,.1)" : "rgba(251,191,36,.1)";
      msg.style.color = isError ? "#fca5a5" : "#fcd34d";
      clearTimeout(showMsg._t);
      showMsg._t = setTimeout(() => msg.classList.add("hidden"), 6000);
    }
  }

  /* ---------- 平滑锚点 ---------- */
  function initSmoothAnchor() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id.length <= 1) return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  return { init };
})();
