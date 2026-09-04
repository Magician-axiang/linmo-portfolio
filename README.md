# 林墨作品集 CMS

一个**自包含的全栈可编辑作品集**：公开首页 + 管理后台 + 内容 API。部署一次后，手机/电脑都能登录后台，随时修改名字、文案、技能、联系方式，以及增删作品（贴 YouTube / Bilibili / 直链视频）。

## 技术栈

- **后端**：Node.js + Express
- **数据库**：PostgreSQL（JSONB 存站点配置，独立表存作品）
- **鉴权**：express-session + bcryptjs（单管理员账号）
- **前端**：原生 HTML/CSS/JS + Tailwind（CDN），零构建
- **图片**：缩略图以 base64 存数据库，无需对象存储

## 项目结构

```
portfolio-cms/
├── server.js              # Express 主入口
├── schema.sql             # 数据库表结构
├── package.json
├── .env.example           # 环境变量模板
├── src/
│   ├── db.js              # Postgres 连接池
│   ├── init-db.js         # 执行 schema.sql
│   ├── seed.js            # 写入初始管理员 + 示例内容
│   ├── middleware/auth.js # 登录校验
│   └── routes/
│       ├── auth.js        # 登录/登出/me
│       ├── content.js     # 公开 GET /api/content
│       └── admin.js       # 后台 CRUD + 上传
├── public/                # 公开首页（数据驱动）
│   ├── index.html
│   ├── css/style.css
│   └── js/{app.js,main.js}
└── admin/                 # 管理后台
    ├── login.html
    ├── dashboard.html
    ├── css/admin.css
    └── js/{login.js,dashboard.js}
```

## 本地启动

### 1. 准备数据库

任选一种最快的方式拿到一个 Postgres：

- **本地安装** PostgreSQL
- **Supabase / Neon**（免费云 Postgres，注册即得连接串，需 `PG_SSL=require`）
- **Docker**：`docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`

### 2. 安装依赖

```bash
cd portfolio-cms
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/portfolio
PG_SSL=                  # 云数据库需要时填 require
SESSION_SECRET=随机长字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456
PORT=3000
```

### 4. 初始化数据库 + 写入示例数据

```bash
npm run db:init   # 建表
npm run seed      # 写入初始管理员与示例内容
```

### 5. 启动

```bash
npm start          # 生产
# 或
npm run dev        # 开发，文件改动自动重启
```

打开：

- 公开首页：<http://localhost:3000>
- 管理后台：<http://localhost:3000/admin>
- 健康检查：<http://localhost:3000/api/health>

用 `.env` 里的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录后台。

## 云端部署（Render + Neon，全免费且永久）

> **为什么不用 Render 自带 Postgres？** Render 免费 Postgres **30 天后会被删除**，不适合长期作品集。Neon 免费 Postgres **永久有效**（0.5GB 足够个人作品集）。

服务每次启动会**自动初始化数据库**（建表 + 仅空库时写入示例数据），云端部署**无需再跑任何 shell 命令**。

### 第一步：创建永久免费数据库（Neon）

1. 打开 [neon.tech](https://neon.tech) → 用 GitHub 账号登录 → New Project
2. Region 选离你近的（如 Singapore），Postgres 版本默认
3. 创建后，在 Dashboard 找到 **Connection string**，形如：
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. **复制保存**这个串 —— 稍后填到 Render。

### 第二步：把代码传到 GitHub

本机当前未装 git，推荐用 **GitHub Desktop**（图形界面，免命令行）：

1. 下载安装 [GitHub Desktop](https://desktop.github.com) → 登录 GitHub
2. File → New Repository → 填名字（如 `linmo-portfolio`）→ Local path 选 `C:\Users\Admin\Documents\trae_projects\portfolio-cms` → Create
3. 它会自动识别所有文件 → 写一句 commit message → Commit to main
4. 点 **Publish repository**（私有仓库即可）

### 第三步：在 Render 用蓝图部署

1. 打开 [render.com](https://render.com) → 用 GitHub 登录（无需信用卡）
2. New → **Blueprint** → 选刚才的 GitHub 仓库
3. Render 自动读取根目录的 `render.yaml` → 显示要创建的服务
4. 在出现的提示中填两个值：
   - `DATABASE_URL` ← 粘贴第一步 Neon 的连接串
   - `ADMIN_PASSWORD` ← 设一个强密码（如 `LinMo@2026!`）
5. 点 **Apply** / **Create** → Render 自动 `npm install` → `npm start`
6. 等待约 1-3 分钟，部署日志出现 `林墨作品集 CMS 已启动` 即成功
7. 访问 `https://你的服务名.onrender.com/admin` → 用 `admin` + 你设的密码登录

> 首次启动服务会自动建表并写入示例内容，无需手动初始化。日后改代码 push 到 GitHub，Render 自动重新部署。

### 关于 Render 免费档的限制

- **15 分钟无访问会休眠**，下次访问冷启动 30-60 秒（作品集低流量可接受）。常驻无休眠升级 Starter 约 $6/月。
- **上传的视频文件会丢失**：Render 免费档文件系统是临时的，重新部署/休眠唤醒后 `uploads/` 会被清空。
  → **建议主力用 YouTube/Bilibili 外链**（永久、零成本），文件上传仅用于本地或临时预览。
  → 图片走 base64 入数据库（Neon 持久），**不会丢**。
- 想让上传视频也永久：挂 Render Disk（$0.25/GB/月）或迁到 Cloudflare R2 对象存储。

### Railway 部署（可选）

类似：New Project → Deploy from GitHub repo → Variables 里加 `DATABASE_URL`（Neon 串）、`SESSION_SECRET`、`ADMIN_USERNAME=admin`、`ADMIN_PASSWORD`、`NODE_ENV=production`、`PG_SSL=require`。Railway 有 Volume 插件可挂载持久卷到 `uploads/`，上传视频不丢。

## 后台能改什么

| 板块 | 可编辑内容 |
|------|-----------|
| 首页 Hero | 接单状态、标题、名字、自我介绍、职业标签、数据统计、视觉图、最新作品卡 |
| 作品管理 | 增删改查作品；标题/简介/分类/角标/视频链接/链接类型/时长/职责/年份/排序/发布状态/封面图 |
| 技能 | 多卡片；分类/标题/描述/技能项(名称+百分比)/工具标签；工作流程步骤 |
| 关于我 | 多段介绍、头像、信息表(标签+内容)、合作品牌 |
| 联系方式 | 邮箱、城市、响应时间、社交链接 |
| 站点设置 | 站点名、Logo 字符、浏览器标题、页脚文案 |
| 修改密码 | 原密码 + 新密码 |

## 视频说明

后台作品编辑器「视频来源」支持三种方式，**推荐顺序如下**：

1. **YouTube 链接（推荐）**：`https://www.youtube.com/watch?v=XXXX` 或 `youtu.be/XXXX`、Shorts
2. **Bilibili 链接（推荐）**：`https://www.bilibili.com/video/BVxxxx`
3. **直接上传视频文件（仅本地/临时预览）**：选「直接上传视频文件 ⚠ 临时存储」，点击或拖拽 mp4/webm 到上传区，带实时进度条。上传后公开首页点击卡片弹窗用 `<video>` 播放，支持进度拖拽。

### 存储策略（重要）

| 内容 | 存储方式 | 是否持久 | 备注 |
|------|---------|---------|------|
| **视频外链（YouTube/Bilibili）** | 仅存 URL 到数据库 | ✅ 永久 | **主力推荐**，零存储零带宽成本 |
| **视频文件上传** | 存到 `uploads/videos/` 目录 | ⚠ 临时 | Render 免费档重部署/休眠唤醒后**会丢失**，仅适合本地或临时演示 |
| **缩略图 / 头像** | base64 存数据库（Neon） | ✅ 永久 | 单图上限 5MB，建议压缩后传；也可贴图片外链 |
| **站点文案 / 配置** | JSONB 存数据库 | ✅ 永久 | 后台所有改动均持久化 |

> **建议主力用 YouTube/Bilibili 外链**——既永久不会丢失，又零存储成本。文件上传仅用于少量未公开发布的私密作品或本地预览。若必须让上传视频也永久，可挂 Render Disk（$0.25/GB/月）或迁到 Cloudflare R2 对象存储。

### 视频文件存储位置

上传的视频文件存于项目根目录的 `uploads/videos/`，通过 `/uploads` 静态服务对外提供（express.static 原生支持 Range 请求，可拖拽跳播）。

**云端部署必须挂载持久磁盘**，否则容器/服务重启后上传的文件会丢失：

- **Render**：Web Service → Disks → 新建 Disk（挂载点填 `/var/data` 或自定义），再设环境变量 `UPLOADS_DIR` 指向该挂载点；或升级到含持久存储的档位。免费档文件系统是**临时**的，仅适合演示，不建议长期存视频。
- **Railway**：使用 Volume 插件挂载持久卷到 `uploads/`。
- **本地**：默认存项目目录，无需额外配置。

> 默认单文件上限 **200MB**，可在环境变量 `MAX_VIDEO_SIZE_MB` 调整。

## 安全提示

- 上线前务必修改 `.env` 里的 `ADMIN_PASSWORD` 与 `SESSION_SECRET`
- 管理后台所有写接口均需登录会话，公开 `/api/content` 只读
- 视频上传接口已限制 mime 为 `video/*`，文件名经清洗防目录穿越
- 数据库密码切勿提交进 git（`.env` 已在 `.gitignore`）

## 常见问题

**Q：图片传到哪了？**
A：缩略图/头像上传后以 base64 存在 Postgres，无需额外存储。单图上限 5MB，建议压缩后传。也可直接贴图片外链。

**Q：上传的视频会丢吗？**
A：**本地不会丢，云端免费档会丢**。Render 免费档文件系统是临时的，重新部署/休眠唤醒后 `uploads/` 会被清空。所以**主力推荐用 YouTube/Bilibili 外链**（永久、零成本），文件上传仅用于本地预览或临时演示。若必须让上传视频也永久，需挂载 Render Disk（付费）或迁到 Cloudflare R2。

**Q：会话会过期吗？**
A：登录有效期 7 天。Render 重启后内存会话会失效，需重新登录（数据不丢）。
