/* =========================================================
   管理后台 — 仪表盘逻辑
   分区：概览 / Hero / 作品 / 技能 / 关于 / 联系 / 站点设置 / 密码
   ========================================================= */

(function () {
  "use strict";

  /* ---------- 状态 ---------- */
  let state = null; // { hero, about, contact, skills, flow, site_meta, works }

  /* ---------- 工具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
    return data;
  }

  let toastTimer;
  function toast(msg, type = "ok") {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast show " + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = "toast hidden"), 2400);
  }

  function val(input) {
    if (!input) return "";
    const v = input.type === "checkbox" ? input.checked : input.value;
    return v;
  }

  /* ---------- 初始化 ---------- */
  async function init() {
    try {
      const me = await api("/api/auth/me");
      if (!me.loggedIn) { location.href = "/admin/login.html"; return; }
      $("#adminUser").textContent = me.username || "admin";
    } catch (e) {
      location.href = "/admin/login.html";
      return;
    }

    bindNav();
    bindTopbar();
    bindLogout();

    try {
      state = await api("/api/admin/settings");
      // 兜底默认结构
      state.hero = state.hero || {};
      state.about = state.about || {};
      state.contact = state.contact || {};
      state.skills = state.skills || [];
      state.flow = state.flow || [];
      state.site_meta = state.site_meta || {};
      state.works = state.works || [];
    } catch (e) {
      $("#contentArea").innerHTML = `<div class="card"><p>加载失败：${esc(e.message)}</p><p class="card-sub">请确认已执行 db:init 与 seed。</p></div>`;
      return;
    }

    // 根据路由 hash 决定初始分区
    const start = (location.hash || "#overview").slice(1);
    showSection(start);
    window.addEventListener("hashchange", () => showSection(location.hash.slice(1)));
  }

  function bindNav() {
    $$(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const sec = item.getAttribute("data-section");
        location.hash = sec;
      });
    });
  }

  function bindTopbar() {
    const toggle = $("#sidebarToggle");
    const sidebar = $("#sidebar");
    const mask = $("#sidebarMask");
    if (toggle) toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      mask.classList.toggle("show");
    });
    if (mask) mask.addEventListener("click", () => {
      sidebar.classList.remove("open");
      mask.classList.remove("show");
    });
  }

  function bindLogout() {
    $("#logoutBtn").addEventListener("click", async () => {
      await api("/api/auth/logout", { method: "POST" });
      location.href = "/admin/login.html";
    });
  }

  function showSection(sec) {
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.getAttribute("data-section") === sec));
    closeSidebar();
    const map = { overview: renderOverview, hero: renderHero, works: renderWorks, skills: renderSkills, about: renderAbout, contact: renderContact, meta: renderMeta, password: renderPassword };
    (map[sec] || renderOverview)();
  }
  function closeSidebar() {
    $("#sidebar")?.classList.remove("open");
    $("#sidebarMask")?.classList.remove("show");
  }

  /* =========================================================
     1. 概览
     ========================================================= */
  function renderOverview() {
    const works = state.works || [];
    const published = works.filter((w) => w.is_published).length;
    const tags = (state.hero?.tags || []).length;
    const skills = (state.skills || []).length;
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">概览</span>
        <h1 class="page-title">你好，${esc(state.site_meta?.site_name || "管理员")} 👋</h1>
        <p class="page-desc">从这里管理你的全部站点内容。所有改动保存后即时生效于公开首页。</p>
      </div>
      <div class="stat-grid">
        <div class="stat"><div class="v">${works.length}</div><div class="l">作品总数</div></div>
        <div class="stat"><div class="v"><span class="acc">${published}</span></div><div class="l">已发布</div></div>
        <div class="stat"><div class="v">${works.length - published}</div><div class="l">草稿</div></div>
        <div class="stat"><div class="v"><span class="acc">${skills}</span></div><div class="l">技能板块</div></div>
        <div class="stat"><div class="v">${tags}</div><div class="l">职业标签</div></div>
      </div>
      <div class="card" style="margin-top:1.25rem">
        <div class="card-head"><div><div class="card-h">快捷入口</div><div class="card-sub">常用操作直达</div></div></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-primary" data-go="works">+ 新增作品</button>
          <button class="btn" data-go="hero">编辑首页</button>
          <button class="btn" data-go="about">更新关于我</button>
          <a class="btn" href="/" target="_blank">查看站点</a>
        </div>
      </div>`;
    $$("[data-go]").forEach((b) => b.addEventListener("click", () => { location.hash = b.getAttribute("data-go"); }));
  }

  /* =========================================================
     2. Hero
     ========================================================= */
  function renderHero() {
    const h = state.hero || {};
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">首页</span>
        <h1 class="page-title">Hero 区域</h1>
        <p class="page-desc">访客打开站点看到的第一屏。intro 中的 {NAME} 会被自动替换为你的名字。</p>
      </div>
      <div class="card">
        <div class="form-grid">
          <label class="field span-2"><span class="field-label">接单状态条文案</span><input class="input" id="h_status" value="${esc(h.status || "")}" /></label>
          <label class="field"><span class="field-label">标题前半段</span><input class="input" id="h_lead" value="${esc(h.title_lead || "")}" /></label>
          <label class="field"><span class="field-label">标题高亮段</span><input class="input" id="h_high" value="${esc(h.title_highlight || "")}" /></label>
          <label class="field"><span class="field-label">你的名字</span><input class="input" id="h_name" value="${esc(h.name || "")}" /></label>
          <label class="field span-2"><span class="field-label">自我介绍 <span class="field-hint">支持 {NAME} 占位</span></span><textarea class="input" id="h_intro" rows="3">${esc(h.intro || "")}</textarea></label>
        </div>
        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">职业标签</div><div class="card-sub">回车添加</div></div></div>
        <div id="h_tags" class="tag-input-wrap"></div>

        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">数据统计</div><div class="card-sub">如 6+ 年经验</div></div></div>
        <div id="h_stats" class="dyn-list"></div>
        <button class="dyn-add" id="h_addStat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg> 添加数据</button>

        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">Hero 视觉图</div><div class="card-sub">可填图片链接或直接上传</div></div></div>
        ${renderUpload("h_heroImg", h.hero_image)}

        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">最新作品卡片</div></div></div>
        <div class="form-grid">
          <label class="field"><span class="field-label">最新作品标题</span><input class="input" id="h_latestT" value="${esc(h.latest_title || "")}" /></label>
          <label class="field"><span class="field-label">最新作品时长</span><input class="input" id="h_latestD" value="${esc(h.latest_duration || "")}" /></label>
        </div>

        <div class="action-bar">
          <span class="saved" id="h_saved"></span>
          <button class="btn btn-primary" id="h_save">保存 Hero</button>
        </div>
      </div>`;

    buildChips("h_tags", h.tags || []);
    buildDynList("h_stats", (h.stats || [{ value: "", suffix: "", label: "" }]), (it) => [
      `<input class="input" data-k="value" placeholder="数值" value="${esc(it.value)}" />`,
      `<input class="input num-mini" data-k="suffix" placeholder="+" value="${esc(it.suffix)}" />`,
      `<input class="input" data-k="label" placeholder="说明" value="${esc(it.label)}" />`,
    ]);
    $("#h_addStat").addEventListener("click", () => addDynRow("h_stats", (it) => [
      `<input class="input" data-k="value" placeholder="数值" value="${esc(it.value)}" />`,
      `<input class="input num-mini" data-k="suffix" placeholder="+" value="${esc(it.suffix)}" />`,
      `<input class="input" data-k="label" placeholder="说明" value="${esc(it.label)}" />`,
    ], { value: "", suffix: "", label: "" }));
    bindUpload("h_heroImg");
    $("#h_save").addEventListener("click", saveHero);
  }

  async function saveHero() {
    const hero = {
      status: val($("#h_status")),
      title_lead: val($("#h_lead")),
      title_highlight: val($("#h_high")),
      name: val($("#h_name")),
      intro: val($("#h_intro")),
      tags: readChips("h_tags"),
      stats: readDynList("h_stats"),
      hero_image: readUpload("h_heroImg"),
      latest_title: val($("#h_latestT")),
      latest_duration: val($("#h_latestD")),
    };
    await saveSection("hero", hero, "#h_saved", "#h_save");
    state.hero = hero;
  }

  /* =========================================================
     3. 作品管理
     ========================================================= */
  let editingWorkId = null;

  function renderWorks() {
    const works = state.works || [];
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">内容</span>
        <h1 class="page-title">作品管理</h1>
        <p class="page-desc">支持贴 YouTube / Bilibili 链接，或直接上传视频文件（编辑器内选「直接上传」）。用序号排序。</p>
      </div>
      <div class="card">
        <div class="card-head">
          <div><div class="card-h">作品列表</div><div class="card-sub">共 ${works.length} 项</div></div>
          <button class="btn btn-primary btn-sm" id="w_new">+ 新增作品</button>
        </div>
        <div id="w_list" class="work-list"></div>
      </div>`;
    renderWorksList();
    $("#w_new").addEventListener("click", () => openWorkEditor(null));
  }

  function renderWorksList() {
    const list = $("#w_list");
    const works = state.works || [];
    if (!works.length) {
      list.innerHTML = `<div class="empty">还没有作品，点击右上方「新增作品」开始。</div>`;
      return;
    }
    list.innerHTML = works
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((w) => `
        <div class="work-row" data-id="${w.id}">
          <div class="work-thumb">${w.thumbnail ? `<img src="${esc(w.thumbnail)}" alt="" />` : `<div class="ph">无封面</div>`}</div>
          <div class="work-info">
            <div class="t">${esc(w.title)} ${w.is_published ? "" : '<span class="badge-off">·草稿</span>'}</div>
            <div class="d">${w.badge ? `<span class="b">${esc(w.badge)}</span>` : ""}${esc(w.role || "")} ${w.year ? "· " + esc(w.year) : ""}</div>
          </div>
          <div class="work-actions">
            <button class="btn btn-sm" data-act="edit">编辑</button>
            <button class="btn btn-sm btn-danger" data-act="del">删除</button>
          </div>
        </div>`)
      .join("");
    $$(".work-row", list).forEach((row) => {
      const id = Number(row.getAttribute("data-id"));
      row.querySelector('[data-act="edit"]').addEventListener("click", () => {
        const w = state.works.find((x) => x.id === id);
        if (w) openWorkEditor(w);
      });
      row.querySelector('[data-act="del"]').addEventListener("click", () => delWork(id));
    });
  }

  function openWorkEditor(w) {
    editingWorkId = w ? w.id : null;
    const data = w || { title: "", description: "", category: "", badge: "", video_url: "", video_type: "youtube", thumbnail: "", role: "", year: "", duration: "", sort_order: state.works.length, is_published: true };
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">${w ? "编辑作品" : "新增作品"}</span>
        <h1 class="page-title">${esc(data.title || "新作品")}</h1>
        <button class="btn btn-ghost btn-sm" id="w_back" style="margin-top:.5rem">← 返回列表</button>
      </div>
      <div class="card">
        <div class="form-grid">
          <label class="field span-2"><span class="field-label">标题 *</span><input class="input" id="w_title" value="${esc(data.title)}" /></label>
          <label class="field span-2"><span class="field-label">简介</span><textarea class="input" id="w_desc" rows="3">${esc(data.description)}</textarea></label>
          <label class="field"><span class="field-label">分类</span><input class="input" id="w_category" value="${esc(data.category)}" placeholder="广告片" /></label>
          <label class="field"><span class="field-label">角标</span><input class="input" id="w_badge" value="${esc(data.badge)}" placeholder="广告片" /></label>
          <label class="field span-2"><span class="field-label">视频来源 <span class="field-hint">推荐用外链，永久不会丢失</span></span>
            <select class="input" id="w_type">
              <option value="youtube" ${data.video_type === "youtube" ? "selected" : ""}>YouTube 链接（推荐）</option>
              <option value="bilibili" ${data.video_type === "bilibili" ? "selected" : ""}>Bilibili 链接（推荐）</option>
              <option value="file" ${data.video_type === "file" ? "selected" : ""}>直接上传视频文件 ⚠ 临时存储</option>
            </select>
          </label>
          <label class="field span-2" id="w_urlWrap"><span class="field-label">视频链接 <span class="field-hint">支持 YouTube / Bilibili / mp4 直链</span></span><input class="input" id="w_url" value="${esc(data.video_url)}" placeholder="https://www.youtube.com/watch?v=..." /></label>
          <div class="field span-2 hidden" id="w_fileWrap">
            <span class="field-label">视频文件 <span class="field-hint">mp4 / webm，单文件上限 ${vidMaxLabel()}</span></span>
            <div class="vid-warn" id="w_vidWarn">
              <span class="vid-warn-icon">⚠</span>
              <span><b>临时存储，重新部署后会丢失</b>。云端作品集建议使用 YouTube / Bilibili 外链。文件上传仅适合本地预览或临时演示。</span>
            </div>
            <div class="vid-upload" id="w_vidZone">
              <input type="file" accept="video/*" id="w_vidFile" class="vid-file-input" />
              <div class="vid-empty" id="w_vidEmpty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <div class="vid-empty-title">点击或拖拽视频到这里</div>
                <div class="field-hint">mp4 / webm，上传后可拖拽播放</div>
              </div>
              <div class="vid-progress hidden" id="w_vidProg">
                <div class="vid-bar"><i id="w_vidBar"></i></div>
                <span id="w_vidPct">0%</span>
              </div>
              <div class="vid-result hidden" id="w_vidRes">
                <video id="w_vidPrev" controls playsinline></video>
                <div class="vid-res-foot">
                  <span class="vid-fname" id="w_vidName"></span>
                  <button type="button" class="btn btn-sm btn-danger" id="w_vidDel">移除视频</button>
                </div>
              </div>
            </div>
          </div>
          <label class="field"><span class="field-label">时长</span><input class="input" id="w_duration" value="${esc(data.duration)}" placeholder="02:14" /></label>
          <label class="field"><span class="field-label">职责</span><input class="input" id="w_role" value="${esc(data.role)}" placeholder="导演 / 剪辑" /></label>
          <label class="field"><span class="field-label">年份</span><input class="input" id="w_year" value="${esc(data.year)}" placeholder="2026" /></label>
          <label class="field"><span class="field-label">排序号 <span class="field-hint">越小越靠前</span></span><input class="input" id="w_sort" type="number" value="${esc(data.sort_order ?? 0)}" /></label>
          <label class="field"><span class="field-label">发布状态</span>
            <div class="checkbox-row">
              <label class="switch"><input type="checkbox" id="w_pub" ${data.is_published ? "checked" : ""}><span class="track"></span><span class="thumb"></span></label>
              <span class="switch-label">公开显示</span>
            </div>
          </label>
        </div>

        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">封面图</div><div class="card-sub">建议 4:3，可上传或贴链接</div></div></div>
        ${renderUpload("w_thumb", data.thumbnail)}

        <div class="action-bar">
          <span class="saved" id="w_saved"></span>
          <div style="display:flex;gap:.5rem">
            <button class="btn" id="w_cancel">取消</button>
            <button class="btn btn-primary" id="w_save">${w ? "保存修改" : "创建作品"}</button>
          </div>
        </div>
      </div>`;

    bindUpload("w_thumb");
    bindVideoEditor(data);
    $("#w_back").addEventListener("click", renderWorks);
    $("#w_cancel").addEventListener("click", renderWorks);
    $("#w_save").addEventListener("click", saveWork);
  }

  /* ---------- 视频编辑器（链接 / 上传切换 + 进度 + 预览） ---------- */
  function vidMaxLabel() {
    return "200MB";
  }

  function bindVideoEditor(data) {
    const typeSel = $("#w_type");
    const urlWrap = $("#w_urlWrap");
    const fileWrap = $("#w_fileWrap");
    const urlInput = $("#w_url");
    const zone = $("#w_vidZone");
    const fileInput = $("#w_vidFile");
    const empty = $("#w_vidEmpty");
    const prog = $("#w_vidProg");
    const bar = $("#w_vidBar");
    const pct = $("#w_vidPct");
    const res = $("#w_vidRes");
    const prev = $("#w_vidPrev");
    const nameEl = $("#w_vidName");
    const delBtn = $("#w_vidDel");

    function toggle() {
      const isFile = typeSel.value === "file";
      urlWrap.classList.toggle("hidden", isFile);
      fileWrap.classList.toggle("hidden", !isFile);
      if (isFile) {
        const cur = urlInput.value.trim();
        if (cur) showPreview(cur, data._filename);
        else showEmpty();
      }
    }
    function showEmpty() {
      empty.classList.remove("hidden");
      prog.classList.add("hidden");
      res.classList.add("hidden");
      prev.removeAttribute("src");
    }
    function showPreview(url, filename) {
      empty.classList.add("hidden");
      prog.classList.add("hidden");
      res.classList.remove("hidden");
      prev.src = url;
      nameEl.textContent = filename || url.split("/").pop() || "已上传视频";
    }
    function showProgress(percent) {
      empty.classList.add("hidden");
      res.classList.add("hidden");
      prog.classList.remove("hidden");
      bar.style.width = percent + "%";
      pct.textContent = Math.round(percent) + "%";
    }

    toggle();
    typeSel.addEventListener("change", toggle);

    async function uploadVideo(file) {
      if (!file) return;
      if (!/^video\//.test(file.type)) { toast("请选择视频文件", "err"); return; }
      try {
        showProgress(0);
        const d = await uploadVideoXHR(file, (p) => showProgress(p));
        urlInput.value = d.url;
        showPreview(d.url, d.filename);
        toast("视频已上传");
      } catch (e) {
        showEmpty();
        toast(e.message || "上传失败", "err");
      }
    }
    fileInput.addEventListener("change", (e) => uploadVideo(e.target.files[0]));

    // 拖拽上传
    ["dragenter", "dragover"].forEach((ev) =>
      zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("drag"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("drag"); })
    );
    zone.addEventListener("drop", (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) uploadVideo(f);
    });

    delBtn.addEventListener("click", () => {
      urlInput.value = "";
      fileInput.value = "";
      showEmpty();
    });
  }

  /** XHR 上传视频，带进度回调，返回 { url, filename, size } */
  function uploadVideoXHR(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("file", file);
      xhr.open("POST", "/api/admin/upload-video");
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
      });
      xhr.addEventListener("load", () => {
        let d = {};
        try { d = JSON.parse(xhr.responseText); } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300) return resolve(d);
        reject(new Error(d.error || `上传失败 (${xhr.status})`));
      });
      xhr.addEventListener("error", () => reject(new Error("网络错误，上传失败")));
      xhr.addEventListener("abort", () => reject(new Error("已取消")));
      xhr.send(fd);
    });
  }

  async function saveWork() {
    const body = {
      title: val($("#w_title")).trim(),
      description: val($("#w_desc")),
      category: val($("#w_category")),
      badge: val($("#w_badge")),
      video_url: val($("#w_url")),
      video_type: val($("#w_type")),
      duration: val($("#w_duration")),
      role: val($("#w_role")),
      year: val($("#w_year")),
      sort_order: Number(val($("#w_sort"))) || 0,
      is_published: val($("#w_pub")),
      thumbnail: readUpload("w_thumb"),
    };
    if (!body.title) { toast("请填写标题", "err"); return; }
    const btn = $("#w_save");
    btn.disabled = true; btn.textContent = "保存中…";
    try {
      if (editingWorkId) {
        const updated = await api(`/api/admin/works/${editingWorkId}`, { method: "PUT", body: JSON.stringify(body) });
        const i = state.works.findIndex((x) => x.id === editingWorkId);
        if (i >= 0) state.works[i] = updated;
        toast("作品已更新");
      } else {
        const created = await api("/api/admin/works", { method: "POST", body: JSON.stringify(body) });
        state.works.push(created);
        toast("作品已创建");
      }
      renderWorks();
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false; btn.textContent = editingWorkId ? "保存修改" : "创建作品";
    }
  }

  async function delWork(id) {
    if (!confirm("确定删除这个作品？此操作不可撤销。")) return;
    try {
      await api(`/api/admin/works/${id}`, { method: "DELETE" });
      state.works = state.works.filter((w) => w.id !== id);
      toast("已删除");
      renderWorks();
    } catch (e) { toast(e.message, "err"); }
  }

  /* =========================================================
     4. 技能 + 工作流程
     ========================================================= */
  function renderSkills() {
    const skills = state.skills && state.skills.length ? state.skills : [{ category: "", title: "", desc: "", items: [], tags: [] }];
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">内容</span>
        <h1 class="page-title">技能板块</h1>
        <p class="page-desc">每个卡片对应一个能力方向。item 的 level 为百分比 0-100。</p>
      </div>
      <div id="sk_cards"></div>
      <button class="dyn-add" id="sk_addCard" style="margin:1.25rem 0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg> 添加技能卡片</button>

      <div class="card">
        <div class="card-head"><div><div class="card-h">工作流程</div><div class="card-sub">技能下方的 4 步流程</div></div>
          <button class="dyn-add" id="fl_add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg> 步骤</button>
        </div>
        <div id="fl_list" class="dyn-list"></div>
      </div>
      <div class="action-bar"><span class="saved" id="sk_saved"></span><button class="btn btn-primary" id="sk_save">保存技能与流程</button></div>`;

    renderSkillCards(skills);
    const flow = state.flow && state.flow.length ? state.flow : [{ no: "01", title: "", desc: "" }];
    buildDynList("fl_list", flow, (it) => [
      `<input class="input num-mini" data-k="no" placeholder="01" value="${esc(it.no)}" />`,
      `<input class="input" data-k="title" placeholder="步骤标题" value="${esc(it.title)}" />`,
      `<input class="input" data-k="desc" placeholder="说明" value="${esc(it.desc)}" />`,
    ]);
    $("#fl_add").addEventListener("click", () => addDynRow("fl_list", (it) => [
      `<input class="input num-mini" data-k="no" placeholder="01" value="${esc(it.no)}" />`,
      `<input class="input" data-k="title" placeholder="步骤标题" value="${esc(it.title)}" />`,
      `<input class="input" data-k="desc" placeholder="说明" value="${esc(it.desc)}" />`,
    ], { no: String(Date.now()).slice(-2), title: "", desc: "" }));
    $("#sk_addCard").addEventListener("click", () => {
      skills.push({ category: "新技能", title: "新技能", desc: "", items: [{ name: "", level: 80 }], tags: [] });
      renderSkillCards(skills);
    });
    $("#sk_save").addEventListener("click", saveSkillsFlow);
  }

  function renderSkillCards(skills) {
    const wrap = $("#sk_cards");
    wrap.innerHTML = skills.map((s, i) => `
      <div class="card" data-skill="${i}">
        <div class="card-head">
          <div><div class="card-h">技能卡片 ${i + 1}</div></div>
          <button class="btn btn-sm btn-danger" data-act="delSkill">删除卡片</button>
        </div>
        <div class="form-grid">
          <label class="field"><span class="field-label">分类标识</span><input class="input" data-k="category" value="${esc(s.category)}" /></label>
          <label class="field"><span class="field-label">卡片标题</span><input class="input" data-k="title" value="${esc(s.title)}" /></label>
          <label class="field span-2"><span class="field-label">描述</span><textarea class="input" data-k="desc" rows="2">${esc(s.desc)}</textarea></label>
        </div>
        <div class="card-head" style="margin-top:1.25rem"><div><div class="card-h">技能项</div></div></div>
        <div class="dyn-list" data-role="items"></div>
        <button class="dyn-add" data-act="addItem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg> 技能项</button>
        <div class="card-head" style="margin-top:1.25rem"><div><div class="card-h">工具标签</div><div class="card-sub">回车添加</div></div></div>
        <div class="tag-input-wrap" data-role="tags"></div>
      </div>`).join("");

    skills.forEach((s, i) => {
      const card = $(`[data-skill="${i}"]`);
      buildDynList($('[data-role="items"]', card), s.items && s.items.length ? s.items : [{ name: "", level: 80 }], (it) => [
        `<input class="input" data-k="name" placeholder="技能名" value="${esc(it.name)}" />`,
        `<input class="input num-mini" data-k="level" type="number" min="0" max="100" placeholder="80" value="${esc(it.level)}" />`,
      ], true);
      buildChips($('[data-role="tags"]', card), s.tags || []);
      $('[data-act="addItem"]', card).addEventListener("click", () => addDynRow($('[data-role="items"]', card), (it) => [
        `<input class="input" data-k="name" placeholder="技能名" value="${esc(it.name)}" />`,
        `<input class="input num-mini" data-k="level" type="number" min="0" max="100" value="${esc(it.level)}" />`,
      ], { name: "", level: 80 }, true));
      $('[data-act="delSkill"]', card).addEventListener("click", () => {
        skills.splice(i, 1);
        renderSkillCards(skills);
      });
    });
  }

  async function saveSkillsFlow() {
    const skills = $$("#sk_cards [data-skill]").map((card) => {
      const i = Number(card.getAttribute("data-skill"));
      return {
        category: val($('[data-k="category"]', card)),
        title: val($('[data-k="title"]', card)),
        desc: val($('[data-k="desc"]', card)),
        items: readDynList($('[data-role="items"]', card)),
        tags: readChips($('[data-role="tags"]', card)),
      };
    });
    const flow = readDynList("#fl_list");
    const btn = $("#sk_save");
    btn.disabled = true; btn.textContent = "保存中…";
    try {
      await api("/api/admin/skills", { method: "PUT", body: JSON.stringify(skills) });
      await api("/api/admin/flow", { method: "PUT", body: JSON.stringify(flow) });
      state.skills = skills;
      state.flow = flow;
      $("#sk_saved").textContent = "已保存 · " + new Date().toLocaleTimeString();
      toast("技能与流程已保存");
    } catch (e) { toast(e.message, "err"); }
    btn.disabled = false; btn.textContent = "保存技能与流程";
  }

  /* =========================================================
     5. 关于我
     ========================================================= */
  function renderAbout() {
    const a = state.about || {};
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">内容</span>
        <h1 class="page-title">关于我</h1>
        <p class="page-desc">个人介绍段落、头像、信息表与合作品牌。</p>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-h">介绍段落</div><div class="card-sub">每段会单独显示</div></div>
          <button class="dyn-add" id="a_addP"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg> 段落</button>
        </div>
        <div id="a_paras" class="dyn-list"></div>

        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">头像</div></div></div>
        ${renderUpload("a_avatar", a.avatar)}

        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">信息表</div></div></div>
        <div id="a_info" class="dyn-list"></div>
        <button class="dyn-add" id="a_addInfo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg> 信息项</button>

        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">合作品牌</div><div class="card-sub">回车添加</div></div></div>
        <div id="a_brands" class="tag-input-wrap"></div>

        <div class="action-bar"><span class="saved" id="a_saved"></span><button class="btn btn-primary" id="a_save">保存关于我</button></div>
      </div>`;

    buildDynList("a_paras", (a.paragraphs && a.paragraphs.length) ? a.paragraphs : [""], (it) => [
      `<textarea class="input" data-k="text" rows="2" placeholder="一段介绍">${esc(typeof it === "string" ? it : it.text)}</textarea>`,
    ], true);
    $("#a_addP").addEventListener("click", () => addDynRow("a_paras", () => [`<textarea class="input" data-k="text" rows="2" placeholder="一段介绍"></textarea>`], "", true));
    buildDynList("a_info", (a.info_rows && a.info_rows.length) ? a.info_rows : [{ label: "", value: "" }], (it) => [
      `<input class="input" data-k="label" placeholder="标签" value="${esc(it.label)}" />`,
      `<input class="input" data-k="value" placeholder="内容" value="${esc(it.value)}" />`,
    ]);
    $("#a_addInfo").addEventListener("click", () => addDynRow("a_info", () => [
      `<input class="input" data-k="label" placeholder="标签" />`,
      `<input class="input" data-k="value" placeholder="内容" />`,
    ], { label: "", value: "" }));
    buildChips("a_brands", a.brands || []);
    bindUpload("a_avatar");
    $("#a_save").addEventListener("click", saveAbout);
  }

  async function saveAbout() {
    const about = {
      paragraphs: readDynList("a_paras").map((x) => x.text),
      avatar: readUpload("a_avatar"),
      info_rows: readDynList("a_info"),
      brands: readChips("a_brands"),
    };
    await saveSection("about", about, "#a_saved", "#a_save");
    state.about = about;
  }

  /* =========================================================
     6. 联系方式
     ========================================================= */
  function renderContact() {
    try {
    const c = state.contact || {};
    const socialsData = (c.socials && Array.isArray(c.socials) && c.socials.length)
      ? c.socials
      : [{ name: "", url: "" }];
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">内容</span>
        <h1 class="page-title">联系方式</h1>
        <p class="page-desc">邮箱、地点、响应时间与社交链接。</p>
      </div>
      <div class="card">
        <div class="form-grid">
          <label class="field"><span class="field-label">邮箱</span><input class="input" id="c_email" value="${esc(c.email)}" /></label>
          <label class="field"><span class="field-label">所在城市</span><input class="input" id="c_location" value="${esc(c.location)}" /></label>
          <label class="field span-2"><span class="field-label">响应时间</span><input class="input" id="c_resp" value="${esc(c.response_time)}" /></label>
        </div>
        <div class="card-head" style="margin-top:1.5rem"><div><div class="card-h">社交链接</div><div class="card-sub">名称会自动匹配图标：YouTube / Bilibili / Instagram / Email</div></div></div>
        <div id="c_socials" class="dyn-list"></div>
        <button type="button" class="dyn-add" id="c_addSocial"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg> 添加社交链接</button>
        <div class="action-bar"><span class="saved" id="c_saved"></span><button type="button" class="btn btn-primary" id="c_save">保存联系方式</button></div>
      </div>`;

    // buildDynList 可能因数据异常而抛错，用 try-catch 包裹确保后续监听器仍能注册
    try {
      buildDynList("c_socials", socialsData, (it) => [
        `<input class="input" data-k="name" placeholder="YouTube" value="${esc(it.name)}" />`,
        `<input class="input" data-k="url" placeholder="https://" value="${esc(it.url)}" />`,
      ]);
    } catch (e) {
      console.error("[contact] buildDynList 失败:", e);
    }

    $("#c_addSocial").addEventListener("click", () => {
      try {
        addDynRow("c_socials", () => [
          `<input class="input" data-k="name" placeholder="YouTube" />`,
          `<input class="input" data-k="url" placeholder="https://" />`,
        ], { name: "", url: "" });
      } catch (e) { console.error("[contact] addDynRow 失败:", e); toast("添加失败: " + e.message, "err"); }
    });
    $("#c_save").addEventListener("click", saveContact);
    } catch (outer) {
      console.error("[contact] renderContact 整体异常:", outer);
      $("#contentArea").innerHTML = `<div class="card"><p style="color:var(--danger)">渲染出错：${esc(outer.message)}</p></div>`;
    }
  }

  async function saveContact() {
    const contact = {
      email: val($("#c_email")),
      location: val($("#c_location")),
      response_time: val($("#c_resp")),
      socials: readDynList("c_socials"),
    };
    await saveSection("contact", contact, "#c_saved", "#c_save");
    state.contact = contact;
  }

  /* =========================================================
     7. 站点设置
     ========================================================= */
  function renderMeta() {
    const m = state.site_meta || {};
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">系统</span>
        <h1 class="page-title">站点设置</h1>
        <p class="page-desc">站点名称、Logo 字符、浏览器标题与页脚文案。</p>
      </div>
      <div class="card">
        <div class="form-grid">
          <label class="field"><span class="field-label">站点名称</span><input class="input" id="m_name" value="${esc(m.site_name)}" /></label>
          <label class="field"><span class="field-label">Logo 字符</span><input class="input" id="m_logo" value="${esc(m.logo_char)}" maxlength="2" /></label>
          <label class="field span-2"><span class="field-label">浏览器标题后缀</span><input class="input" id="m_suffix" value="${esc(m.title_suffix)}" /></label>
          <label class="field span-2"><span class="field-label">页脚文案</span><input class="input" id="m_footer" value="${esc(m.footer_text)}" /></label>
        </div>
        <div class="action-bar"><span class="saved" id="m_saved"></span><button class="btn btn-primary" id="m_save">保存设置</button></div>
      </div>`;
    $("#m_save").addEventListener("click", saveMeta);
  }

  async function saveMeta() {
    const meta = {
      site_name: val($("#m_name")),
      logo_char: val($("#m_logo")) || val($("#m_name")).charAt(0),
      title_suffix: val($("#m_suffix")),
      footer_text: val($("#m_footer")),
    };
    await saveSection("site_meta", meta, "#m_saved", "#m_save");
    state.site_meta = meta;
    document.title = "管理后台 · " + (meta.site_name || "林墨");
  }

  /* =========================================================
     8. 修改密码
     ========================================================= */
  function renderPassword() {
    $("#contentArea").innerHTML = `
      <div class="page-head">
        <span class="page-eyebrow">系统</span>
        <h1 class="page-title">修改密码</h1>
        <p class="page-desc">建议定期更换。新密码至少 6 位。</p>
      </div>
      <div class="card" style="max-width:480px">
        <div class="form-grid">
          <label class="field span-2"><span class="field-label">原密码</span><input class="input" type="password" id="p_old" autocomplete="current-password" /></label>
          <label class="field span-2"><span class="field-label">新密码</span><input class="input" type="password" id="p_new" autocomplete="new-password" /></label>
          <label class="field span-2"><span class="field-label">确认新密码</span><input class="input" type="password" id="p_new2" autocomplete="new-password" /></label>
        </div>
        <div class="action-bar"><span class="saved" id="p_saved"></span><button class="btn btn-primary" id="p_save">修改密码</button></div>
      </div>`;
    $("#p_save").addEventListener("click", savePassword);
  }

  async function savePassword() {
    const oldP = val($("#p_old"));
    const newP = val($("#p_new"));
    const newP2 = val($("#p_new2"));
    if (newP !== newP2) { toast("两次新密码不一致", "err"); return; }
    if (newP.length < 6) { toast("新密码至少 6 位", "err"); return; }
    const btn = $("#p_save");
    btn.disabled = true; btn.textContent = "提交中…";
    try {
      await api("/api/admin/password", { method: "PUT", body: JSON.stringify({ oldPassword: oldP, newPassword: newP }) });
      $("#p_saved").textContent = "密码已更新 · " + new Date().toLocaleTimeString();
      toast("密码已更新");
      $("#p_old").value = ""; $("#p_new").value = ""; $("#p_new2").value = "";
    } catch (e) { toast(e.message, "err"); }
    btn.disabled = false; btn.textContent = "修改密码";
  }

  /* =========================================================
     通用：保存某个 section
     ========================================================= */
  async function saveSection(col, body, savedSel, btnSel) {
    const btn = $(btnSel);
    btn.disabled = true; const old = btn.textContent; btn.textContent = "保存中…";
    try {
      await api(`/api/admin/${col}`, { method: "PUT", body: JSON.stringify(body) });
      $(savedSel).textContent = "已保存 · " + new Date().toLocaleTimeString();
      toast("已保存");
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false; btn.textContent = old;
      throw e;
    }
    btn.disabled = false; btn.textContent = old;
  }

  /* =========================================================
     组件：标签 chip 输入
     ========================================================= */
  function buildChips(container, arr) {
    const el = typeof container === "string" ? $(container) : container;
    el._chips = arr.slice();
    drawChips(el);
    if (!el._bound) {
      const input = document.createElement("input");
      input.placeholder = "输入后回车添加";
      el.appendChild(input);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          const v = input.value.trim().replace(/,$/, "");
          if (v) { el._chips.push(v); input.value = ""; drawChips(el); }
        } else if (e.key === "Backspace" && !input.value && el._chips.length) {
          el._chips.pop(); drawChips(el);
        }
      });
      el._bound = true;
    } else {
      el.querySelector("input").value = "";
    }
  }
  function drawChips(el) {
    $$(".tag-chip", el).forEach((c) => c.remove());
    const input = el.querySelector("input");
    el._chips.forEach((t, i) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `${esc(t)}<button type="button" aria-label="删除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M6 18L18 6" stroke-linecap="round"/></svg></button>`;
      chip.querySelector("button").addEventListener("click", () => { el._chips.splice(i, 1); drawChips(el); });
      el.insertBefore(chip, input);
    });
  }
  function readChips(container) {
    const el = typeof container === "string" ? $(container) : container;
    return el._chips ? el._chips.slice() : [];
  }

  /* =========================================================
     组件：动态行列表
     ========================================================= */
  function buildDynList(container, items, cellTpl, singleKey) {
    const el = typeof container === "string" ? $(container) : container;
    el._tpl = cellTpl;
    el._singleKey = singleKey;
    el._items = items.slice();
    drawDynList(el);
  }
  function drawDynList(el) {
    el.innerHTML = "";
    el._items.forEach((it, idx) => {
      const row = document.createElement("div");
      row.className = "dyn-row";
      row.innerHTML = el._tpl(it).join("") +
        `<button class="dyn-remove" type="button" aria-label="删除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M6 18L18 6" stroke-linecap="round"/></svg></button>`;
      row.querySelector(".dyn-remove").addEventListener("click", () => { el._items.splice(idx, 1); drawDynList(el); });
      el.appendChild(row);
    });
  }
  function addDynRow(container, tpl, newItem, singleKey) {
    const el = typeof container === "string" ? $(container) : container;
    if (!el._items) { el._items = []; el._tpl = tpl; el._singleKey = singleKey; }
    el._items.push(newItem);
    drawDynList(el);
  }
  function readDynList(container) {
    const el = typeof container === "string" ? $(container) : container;
    const rows = $$(".dyn-row", el);
    return rows.map((r) => {
      const inputs = $$("input, textarea, select", r);
      if (el._singleKey && inputs.length === 1) {
        return { text: val(inputs[0]) };
      }
      const obj = {};
      inputs.forEach((inp) => { const k = inp.getAttribute("data-k"); if (k) obj[k] = val(inp); });
      if ("level" in obj) obj.level = Number(obj.level) || 0;
      return obj;
    });
  }

  /* =========================================================
     组件：图片上传
     ========================================================= */
  function renderUpload(id, currentUrl) {
    return `
      <div class="upload-box" id="${id}_box">
        <div class="upload-preview" id="${id}_prev">
          ${currentUrl ? `<img src="${esc(currentUrl)}" alt="" />` : `<div class="ph">无图片</div>`}
        </div>
        <div class="upload-actions">
          <label class="btn btn-sm upload-file">上传图片
            <input type="file" accept="image/*" data-upload="${id}" />
          </label>
          <input class="input" id="${id}_url" placeholder="或粘贴图片链接" value="${esc(currentUrl)}" />
        </div>
      </div>`;
  }
  function bindUpload(id) {
    const fileInput = $(`[data-upload="${id}"]`);
    const urlInput = $(`#${id}_url`);
    const prev = $(`#${id}_prev`);
    if (fileInput) fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast("图片过大（上限 5MB）", "err"); return; }
      const fd = new FormData();
      fd.append("file", file);
      try {
        toast("上传中…", "ok");
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "上传失败");
        urlInput.value = d.url;
        prev.innerHTML = `<img src="${d.url}" alt="" />`;
        toast("图片已上传");
      } catch (err) { toast(err.message, "err"); }
    });
    if (urlInput) urlInput.addEventListener("input", () => {
      const v = urlInput.value.trim();
      prev.innerHTML = v ? `<img src="${esc(v)}" alt="" />` : `<div class="ph">无图片</div>`;
    });
  }
  function readUpload(id) {
    const input = $(`#${id}_url`);
    return input ? input.value.trim() : "";
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", init);
})();
