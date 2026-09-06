/* =========================================================
   公开首页 — 数据驱动渲染
   从 /api/content 获取内容并渲染到页面
   ========================================================= */

window.App = (function () {
  "use strict";

  let DATA = null;

  /* ---------- 工具：转义文本 ---------- */
  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- 工具：把视频链接转成可嵌入 HTML ---------- */
  function videoEmbedHtml(url, type) {
    if (!url) return "";
    const u = String(url).trim();
    const yt =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/;
    const bilibili = /bilibili\.com\/video\/(BV[\w]+)/i;
    const mY = u.match(yt);
    const mB = u.match(bilibili);

    if (mY) {
      return `<iframe src="https://www.youtube.com/embed/${mY[1]}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    }
    if (mB) {
      return `<iframe src="https://player.bilibili.com/player.html?bvid=${mB[1]}&high_quality=1&autoplay=1" allowfullscreen scrolling="no"></iframe>`;
    }
    // 直接 mp4 / 其他链接
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u) || type === "file") {
      return `<video src="${esc(u)}" controls playsinline></video>`;
    }
    // 兜底：外链跳转
    return `<iframe src="${esc(u)}" allowfullscreen></iframe>`;
  }

  /* ---------- Hero ---------- */
  function renderHero(hero, meta) {
    const el = document.getElementById("heroContainer").querySelector(".grid");
    if (!hero || !Object.keys(hero).length) {
      el.innerHTML = '<p class="text-zinc-500">内容尚未配置，请登录后台编辑。</p>';
      return;
    }
    const tags = (hero.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const stats = (hero.stats || [])
      .map(
        (s) => `
        <div>
          <div class="font-display text-2xl sm:text-3xl font-bold text-white">${esc(s.value)}<span class="text-gold-400">${esc(s.suffix || "")}</span></div>
          <div class="mt-1 text-xs text-zinc-500">${esc(s.label)}</div>
        </div>`
      )
      .join("");
    const name = esc(hero.name || meta.site_name || "");
    const intro = esc((hero.intro || "").replace("{NAME}", hero.name || "")).replace(
      `{NAME}`,
      name
    );
    const hv = String(hero.hero_video || "").trim();
    const isDirectVideo =
      /^\/uploads\/videos\//.test(hv) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(hv);

    el.innerHTML = `
      <div class="lg:col-span-7">
        <div class="reveal inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-gold-400"></span>
          </span>
          ${esc(hero.status || "正在接单")}
        </div>
        <h1 class="reveal mt-6 font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] text-white">
          ${esc(hero.title_lead || "用画面讲好")}
          <span class="relative whitespace-nowrap">
            <span class="bg-gradient-to-r from-gold-300 via-gold-400 to-amber-600 bg-clip-text text-transparent">${esc(hero.title_highlight || "每一个故事")}</span>
          </span>
        </h1>
        <p class="reveal mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-400">${intro}</p>
        <div class="reveal mt-7 flex flex-wrap gap-2.5">${tags}</div>
        <div class="reveal mt-9 flex flex-wrap items-center gap-4">
          <a href="#works" class="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-300">
            查看作品
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7-7 7M5 12h16"/></svg>
          </a>
          <a href="#contact" class="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/5">联系合作</a>
        </div>
        <div class="reveal mt-12 grid grid-cols-3 gap-6 max-w-md">${stats}</div>
      </div>
      <div class="lg:col-span-5 reveal">
        <div class="relative mx-auto max-w-md">
          <div class="absolute -inset-4 bg-gradient-to-tr from-gold-500/20 via-transparent to-transparent rounded-3xl blur-2xl"></div>
          <div class="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-800">
            <div class="relative aspect-[4/5] w-full">
              ${hero.hero_image ? `<img id="heroPoster" src="${esc(hero.hero_image)}" alt="工作场景" loading="lazy" class="absolute inset-0 h-full w-full object-cover opacity-90" />` : `<div class="absolute inset-0 bg-ink-700"></div>`}
              ${isDirectVideo ? `<video id="heroVid" class="absolute inset-0 hidden h-full w-full object-cover" src="${esc(hv)}" preload="metadata" playsinline></video>` : ""}
              ${hv ? `
              <button id="heroPlayBtn" type="button" aria-label="播放视频" class="group absolute inset-0 grid place-items-center">
                <span class="grid h-16 w-16 place-items-center rounded-full bg-gold-400/95 text-ink-950 shadow-xl shadow-black/40 transition group-hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </span>
              </button>` : ""}
            </div>
            <div id="heroBottomMask" class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent"></div>
            <div id="heroLatestCard" class="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/80 p-3 backdrop-blur-md">
              <div class="flex items-center gap-3">
                <span id="heroCardPlay" class="grid h-10 w-10 place-items-center rounded-xl bg-gold-400 text-ink-950 ${hv ? "cursor-pointer" : ""}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </span>
                <div>
                  <div class="text-xs text-zinc-400">最新作品</div>
                  <div class="text-sm font-medium text-white">${esc(hero.latest_title || "")}</div>
                </div>
              </div>
              <span class="text-xs text-zinc-500">${esc(hero.latest_duration || "")}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    /* 视频播放：直链文件内联播放；YouTube / B站 等外链用弹窗播放 */
    const playBtn = document.getElementById("heroPlayBtn");
    const cardPlay = document.getElementById("heroCardPlay");
    const playHeroVideo = () => {
      if (!hv) return;
      const vid = document.getElementById("heroVid");
      if (vid) {
        vid.classList.remove("hidden");
        vid.controls = true;
        const poster = document.getElementById("heroPoster");
        if (poster) poster.classList.add("hidden");
        const mask = document.getElementById("heroBottomMask");
        const card = document.getElementById("heroLatestCard");
        if (mask) mask.classList.add("hidden");
        if (card) card.classList.add("hidden");
        if (playBtn) playBtn.classList.add("hidden");
        vid.play().catch(() => {});
      } else {
        openVideoModal({ video_url: hv, video_type: "link", title: hero.latest_title || "作品视频", description: "" });
      }
    };
    if (playBtn) playBtn.addEventListener("click", playHeroVideo);
    if (cardPlay && hv) cardPlay.addEventListener("click", playHeroVideo);
  }

  /* ---------- 作品 ---------- */
  function renderWorks(works) {
    const grid = document.getElementById("worksGrid");
    if (!works || !works.length) {
      grid.innerHTML = '<p class="text-zinc-500 col-span-full text-center py-12">暂无作品，请在后台添加。</p>';
      return;
    }
    grid.innerHTML = works
      .map((w) => {
        const safe = w.video_url ? "" : "no-video";
        return `
        <article class="work-card reveal group" data-work-id="${w.id}">
          <div class="card-media">
            ${w.thumbnail ? `<img src="${esc(w.thumbnail)}" alt="${esc(w.title)}" loading="lazy" />` : `<div class="grid place-items-center w-full h-full bg-ink-700 text-zinc-600">无封面</div>`}
            ${w.badge ? `<span class="card-badge">${esc(w.badge)}</span>` : ""}
            <div class="card-overlay">
              <div class="card-play"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
              <div class="card-meta">
                ${w.duration ? `<span>${esc(w.duration)}</span><span class="opacity-40">·</span>` : ""}
                <span>${w.video_type === "file" ? "视频" : "播放"}</span>
              </div>
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title">${esc(w.title)}</h3>
            ${w.description ? `<p class="card-desc">${esc(w.description)}</p>` : ""}
            <div class="card-foot">
              <span>${esc(w.role || "")}</span>
              ${w.year ? `<span class="text-gold-400">${esc(w.year)}</span>` : ""}
            </div>
          </div>
        </article>`;
      })
      .join("");

    // 绑定点击 → 打开视频弹窗
    grid.querySelectorAll(".work-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-work-id");
        const w = works.find((x) => String(x.id) === String(id));
        if (w) openVideoModal(w);
      });
    });
  }

  /* ---------- 技能 ---------- */
  function renderSkills(skills) {
    const grid = document.getElementById("skillsGrid");
    const flow = document.getElementById("flowGrid");
    if (!skills || !skills.length) {
      grid.innerHTML = '<p class="text-zinc-500 col-span-full">暂无技能数据。</p>';
      flow.innerHTML = "";
      return;
    }
    grid.innerHTML = skills
      .map(
        (s) => {
          const items = (s.items || [])
            .map(
              (it) => `
              <li><span>${esc(it.name)}</span><span class="bar"><i style="--w:${esc(it.level)}%"></i></span></li>`
            )
            .join("");
          const tags = (s.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");
          const icon = skillIcon(s.category);
          return `
          <div class="skill-card reveal">
            <div class="skill-icon">${icon}</div>
            <h3 class="skill-title">${esc(s.title || s.category)}</h3>
            <p class="skill-desc">${esc(s.desc || "")}</p>
            <ul class="skill-list">${items}</ul>
            <div class="skill-tags">${tags}</div>
          </div>`;
        }
      )
      .join("");
  }

  function skillIcon(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("后期")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18" stroke-linecap="round"/></svg>';
    if (c.includes("营销") || c.includes("海外")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3 4 6 4 10s-1 7-4 10c-3-3-4-6-4-10s1-7 4-10z"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 4v16M17 4v16M3 8h4M3 16h4M17 8h4M17 16h4M7 12h10" stroke-linecap="round"/></svg>';
  }

  /* ---------- 工作流程 ---------- */
  function renderFlow(flow) {
    const el = document.getElementById("flowGrid");
    if (!flow || !flow.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = flow
      .map(
        (f) => `
        <div class="flow-step">
          <span class="flow-no">${esc(f.no || "")}</span>
          <h4>${esc(f.title || "")}</h4>
          <p>${esc(f.desc || "")}</p>
        </div>`
      )
      .join("");
  }

  /* ---------- 关于 ---------- */
  function renderAbout(about) {
    const el = document.getElementById("aboutContainer");
    if (!about || !Object.keys(about).length) {
      el.innerHTML = "";
      return;
    }
    const paragraphs = (about.paragraphs || [])
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");
    const info = (about.info_rows || [])
      .map(
        (r) => `
        <div class="info-row"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`
      )
      .join("");
    const brands = (about.brands || [])
      .map((b) => `<span class="brand">${esc(b)}</span>`)
      .join("");

    el.innerHTML = `
      <div class="lg:col-span-5 reveal">
        <div class="relative max-w-sm">
          <div class="absolute -inset-3 bg-gradient-to-tr from-gold-500/20 to-transparent rounded-3xl blur-2xl"></div>
          <div class="relative overflow-hidden rounded-3xl border border-white/10">
            ${about.avatar ? `<img src="${esc(about.avatar)}" alt="${esc(about.name)}" loading="lazy" class="aspect-[4/5] w-full object-cover" />` : ""}
          </div>
        </div>
      </div>
      <div class="lg:col-span-7 reveal">
        <span class="section-eyebrow">03 — 关于我</span>
        <h2 class="section-title mt-3">把每个画面，都当作一次表达</h2>
        <div class="mt-6 space-y-4 text-zinc-400 leading-relaxed">${paragraphs}</div>
        <dl class="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">${info}</dl>
        <div class="mt-10">
          <p class="text-xs uppercase tracking-widest text-zinc-600">合作过的品牌与平台</p>
          <div class="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-zinc-500">${brands}</div>
        </div>
      </div>
    `;
  }

  /* ---------- 联系 ---------- */
  function renderContact(contact) {
    const el = document.getElementById("contactContainer");
    if (!contact || !Object.keys(contact).length) {
      el.innerHTML = "";
      return;
    }
    const socials = (contact.socials || [])
      .map(
        (s) => `<a href="${esc(s.url)}" class="social" aria-label="${esc(s.name)}" target="_blank" rel="noopener">${socialIcon(s.name)}</a>`
      )
      .join("");

    el.innerHTML = `
      <div class="lg:col-span-5 reveal">
        <span class="section-eyebrow">04 — 联系</span>
        <h2 class="section-title mt-3">有项目想聊聊？</h2>
        <p class="mt-4 text-zinc-400 leading-relaxed">无论是品牌广告、社媒内容还是海外营销合作，欢迎留下你的需求。通常 24 小时内回复。</p>
        <ul class="mt-8 space-y-4 text-sm">
          <li class="contact-item">
            <span class="contact-ic">${socialIcon("Email")}</span>
            <div><div class="text-zinc-500 text-xs">邮箱</div><a href="mailto:${esc(contact.email)}" class="text-white hover:text-gold-300 transition">${esc(contact.email || "")}</a></div>
          </li>
          <li class="contact-item">
            <span class="contact-ic">${socialIcon("Location")}</span>
            <div><div class="text-zinc-500 text-xs">所在城市</div><span class="text-white">${esc(contact.location || "")}</span></div>
          </li>
          <li class="contact-item">
            <span class="contact-ic">${socialIcon("Clock")}</span>
            <div><div class="text-zinc-500 text-xs">响应时间</div><span class="text-white">${esc(contact.response_time || "")}</span></div>
          </li>
        </ul>
        <div class="mt-8 flex gap-3">${socials}</div>
      </div>
      <div class="lg:col-span-7 reveal">
        <form id="contactForm" class="rounded-3xl border border-white/10 bg-ink-900/50 p-6 sm:p-8 backdrop-blur" onsubmit="return false;">
          <div class="grid sm:grid-cols-2 gap-5">
            <label class="field"><span class="field-label">姓名 *</span><input type="text" name="name" required placeholder="你的称呼" class="input" /></label>
            <label class="field"><span class="field-label">邮箱 *</span><input type="email" name="email" required placeholder="name@email.com" class="input" /></label>
            <label class="field sm:col-span-2"><span class="field-label">项目类型</span>
              <select name="type" class="input">
                <option>品牌广告片</option><option>社媒短视频</option><option>纪录 / MV</option><option>海外营销内容</option><option>其他</option>
              </select>
            </label>
            <label class="field sm:col-span-2"><span class="field-label">需求简述 *</span><textarea name="msg" rows="4" required placeholder="简单聊聊你的项目目标、时间线与预算区间……" class="input resize-none"></textarea></label>
          </div>
          <div class="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p class="text-xs text-zinc-500">提交即表示同意我仅用于回复你的需求。</p>
            <button type="submit" class="inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-7 py-3.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-300">发送需求
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7-7 7M5 12h16"/></svg>
            </button>
          </div>
          <p id="formMsg" class="mt-4 hidden rounded-xl border px-4 py-3 text-sm"></p>
        </form>
      </div>
    `;
  }

  function socialIcon(name) {
    const n = (name || "").toLowerCase();
    if (n === "youtube") return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.5-.5-5a2.6 2.6 0 00-1.8-1.8C19 5 12 5 12 5s-7 0-8.7.2A2.6 2.6 0 001.5 7C1 8.5 1 12 1 12s0 3.5.5 5a2.6 2.6 0 001.8 1.8C5 19 12 19 12 19s7 0 8.7-.2a2.6 2.6 0 001.8-1.8c.5-1.5.5-5 .5-5zM10 15.5v-7l6 3.5-6 3.5z"/></svg>';
    if (n === "bilibili") return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l3.5 3h7L19 4l-1 3h1a3 3 0 013 3v8a3 3 0 01-3 3H5a3 3 0 01-3-3v-8a3 3 0 013-3h1l-1-3zm3 7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2v-2a1 1 0 10-2 0v2H8z"/></svg>';
    if (n === "instagram") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';
    if (n === "email") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z"/></svg>';
    if (n === "location") return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.7 0 5 2.2 5 5 0 3.5-3.2 7.5-5 9-1.8-1.5-5-5.5-5-9 0-2.8 2.3-5 5-5zm0 3a2 2 0 100 4 2 2 0 000-4z"/></svg>';
    if (n === "clock") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/></svg>';
  }

  /* ---------- 视频弹窗 ---------- */
  function openVideoModal(w) {
    const modal = document.getElementById("videoModal");
    const frame = document.getElementById("videoFrame");
    const titleEl = document.getElementById("videoTitle");
    const descEl = document.getElementById("videoDesc");
    if (!w.video_url) {
      frame.innerHTML = '<div class="grid place-items-center w-full h-full text-zinc-500 text-sm">该作品暂未提供视频链接</div>';
    } else {
      frame.innerHTML = videoEmbedHtml(w.video_url, w.video_type);
    }
    titleEl.textContent = w.title || "";
    descEl.textContent = w.description || "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }
  window.closeVideoModal = function () {
    const modal = document.getElementById("videoModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
    document.getElementById("videoFrame").innerHTML = ""; // 停止播放
  };

  /* ---------- 元信息 ---------- */
  function renderMeta(meta, hero) {
    const siteName = (meta && meta.site_name) || "林墨";
    document.getElementById("navLogo").textContent = (meta && meta.logo_char) || siteName.charAt(0);
    document.getElementById("footerLogo").textContent = (meta && meta.logo_char) || siteName.charAt(0);
    const nameHtml = `${esc(siteName)}<span class="text-gold-400">.</span>`;
    const navName = document.getElementById("navName");
    if (navName) navName.innerHTML = nameHtml;
    if (meta && meta.footer_text) document.getElementById("footerText").textContent = meta.footer_text;
    const pageTitleEl = document.getElementById("pageTitle");
    if (pageTitleEl && meta) pageTitleEl.textContent = `${siteName} · ${meta.title_suffix || ""}`;
    const descEl = document.getElementById("metaDesc");
    if (descEl && hero && hero.intro) descEl.setAttribute("content", hero.intro.replace("{NAME}", siteName));
  }

  /* ---------- 主入口 ---------- */
  async function init() {
    try {
      const res = await fetch("/api/content");
      if (!res.ok) throw new Error("HTTP " + res.status);
      DATA = await res.json();
      renderMeta(DATA.site_meta, DATA.hero);
      renderHero(DATA.hero, DATA.site_meta);
      renderWorks(DATA.works);
      renderSkills(DATA.skills);
      renderFlow(DATA.flow);
      renderAbout(DATA.about);
      renderContact(DATA.contact);
      // 渲染完成后触发交互脚本
      if (window.Main && typeof window.Main.init === "function") {
        window.Main.init();
      }
    } catch (err) {
      console.error("[app] 加载内容失败:", err);
      const el = document.getElementById("heroContainer").querySelector(".grid");
      if (el) {
        el.innerHTML = `
          <div class="lg:col-span-12 text-center py-20">
            <p class="text-zinc-400">内容加载失败</p>
            <p class="mt-2 text-sm text-zinc-600">${esc(err.message)}</p>
            <p class="mt-4 text-sm text-zinc-500">请确认数据库已初始化并执行了 seed。<br/>后台地址：<a href="/admin" class="text-gold-400 underline">/admin</a></p>
          </div>`;
      }
    }
  }

  return { init, getData: () => DATA };
})();

document.addEventListener("DOMContentLoaded", App.init);
