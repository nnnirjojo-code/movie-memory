# 🎬 个人电影记忆档案馆

一个人通过电影记录自己人生变化的档案系统。

## 技术栈

- **前端**: Next.js 16 (App Router) + TypeScript + TailwindCSS
- **后端**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **数据源**: TMDB API
- **部署**: Vercel

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页：海报墙
│   ├── layout.tsx             # 根布局
│   ├── globals.css            # 全局样式
│   ├── login/                 # 登录页
│   ├── admin/                 # 管理后台（搜索+添加电影）
│   ├── timeline/              # 个人观看时间线
│   ├── movies/
│   │   ├── page.tsx           # 电影目录（搜索+分类）
│   │   └── [id]/page.tsx      # 电影详情页
│   └── api/
│       ├── tmdb/search/       # TMDB 搜索代理
│       ├── tmdb/[id]/         # TMDB 电影详情代理
│       └── movies/sync/[id]/  # 同步 TMDB 数据到本地数据库
├── components/
│   └── navbar.tsx             # 导航栏
├── lib/
│   └── supabase/
│       ├── client.ts          # 浏览器端 Supabase 客户端
│       └── server.ts          # 服务端 Supabase 客户端（SSR）
├── types/
│   └── movie.ts               # 全栈类型定义
└── middleware.ts               # Auth 会话刷新 + 路由保护

supabase/
└── migrations/
    └── 00001_schema.sql        # 数据库建表 + RLS 策略
```

## 快速开始

### 1. 创建 Supabase 项目

1. 打开 https://supabase.com/dashboard → New project
2. 记下 **Project URL** 和 **anon public key**（Settings → API）
3. 在 SQL Editor 中执行 `supabase/migrations/00001_schema.sql`

### 2. 创建 Storage Bucket

在 Supabase Dashboard → Storage 中创建 `movie-memory` bucket，配置权限：
- `posters/` 目录公开读
- `screenshots/{userId}/` 目录仅 owner 读写
- `clips/{userId}/` 目录仅 owner 读写

### 3. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase URL、anon key 和 TMDB API Key
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

### 5. 添加第一个用户

在 Supabase Dashboard → Authentication → Users → Add user 创建邮箱/密码用户。
登录后进入 `/admin` 搜索 TMDB 并添加电影。

## 数据库表

| 表名 | 说明 |
|------|------|
| `movies` | 电影核心数据（TMDB 自动填充） |
| `movie_memories` | 个人电影记忆（评分、笔记、影评） |
| `movie_media` | 用户上传的截图/视频文件索引 |
| `watch_history` | 观看时间线（支持重复观看记录） |

## License

MIT
