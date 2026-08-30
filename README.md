# PARALLAX

PARALLAX（视差社区）是一个开源、自托管的综合技术社区。它面向文档、文章、视频、图文、讨论、外部 Signal 和社区扩展，目标是让社区成员既能贡献内容，也能参与构建社区本体。

项目采用 monorepo 组织。第一阶段保持可单机部署，同时为后续拆分 Web、API、Radar、数据库包和共享组件保留清晰边界。

## 核心范围

- 社区内容：文章、文档、视频、图文和讨论。
- 身份系统：账号、邮箱验证、身份卡、成员主页。
- New 信息流：合并社区新发布与 Radar 摄入的外部 Signal。
- Radar：观察公开互联网来源，筛选 GitHub、arXiv、RSS、模型发布、游戏技术、硬件、创作工具和科学资料。
- 自托管：PostgreSQL、Redis、本地上传目录，后续可切换 S3 兼容对象存储。
- 扩展方向：内容块、个人主页组件、外部平台同步、插件 manifest。

## 目录结构

```txt
parallax/
  apps/
    web/                 Next.js Web 应用；当前也承载 /api/* Route Handlers
    api/                 独立 API 服务预留工作区
  services/
    radar/               外部世界到社区 Signal 的信息系统
      sources/           GitHub / arXiv / RSS / Hugging Face 等来源适配
      collector/         抓取、速率限制、失败重试
      normalize/         数据标准化、正文清洗、链接归一化
      dedupe/            去重、相似项合并、历史游标
      classify/          领域分类、跨领域标签、质量解释
      rank/              Signal 排序、新鲜度、热度、来源可信度
      summarize/         摘要、可读标题、人工接管建议
  packages/
    db/                  Prisma schema、migration、seed
    ui/                  共用 UI 包预留
    types/               Post / Signal / Topic 等共享类型
    config/              共享配置包预留
  infra/
    docker/              Dockerfile 与 Docker Compose
    deploy/              部署资料预留
  config/                本地 Radar 配置示例；真实配置不进入 git
  data/uploads/          本地上传目录；文件本体不进入 git
  docs/                  中文架构、设计和部署文档
  scripts/               本地开发辅助脚本
```

当前 API 仍由 `apps/web/src/app/api` 提供，目的是降低第一版部署复杂度。`apps/api` 保留为后续独立 API 服务边界。

## 技术栈

- Monorepo：npm workspaces
- Web：Next.js 16、React 19、TypeScript
- 数据库：PostgreSQL、Prisma
- 缓存/队列预留：Redis
- 编辑器：TipTap
- 邮件：SMTP / Nodemailer
- 部署：Docker Compose，可由 1Panel、Nginx 或同类工具托管

## 本地开发

准备 Node.js 22+、PostgreSQL 和 Redis。仓库提供本地隔离环境脚本：

```bash
source scripts/dev-env.sh
scripts/local-services.sh start
```

复制环境变量：

```bash
cp .env.example .env
```

至少修改：

```txt
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://parallax:parallax@localhost:5432/parallax?schema=public
SEED_OWNER_EMAIL=owner@example.local
SEED_OWNER_HANDLE=owner
SEED_OWNER_NAME=Owner
SEED_OWNER_PASSWORD=change-me-before-public-deploy
RADAR_SHARED_SECRET=生成一段足够长的随机字符串
PARALLAX_BASE_URL=http://127.0.0.1:3000
```

安装依赖并初始化数据库：

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

打开：

```txt
http://localhost:3000
```

## 常用命令

```bash
npm run dev              # 启动 apps/web
npm run build            # 生成 Prisma Client 并构建 Web
npm run start            # 启动生产 Web
npm run lint             # 检查整个 monorepo
npm run db:migrate       # 开发迁移
npm run db:deploy        # 生产迁移
npm run db:seed          # 初始化站点所有者和基础领域时钟
npm run radar:dry-run    # 抓取真实来源但不写库
npm run radar:once       # 抓取并写入一次 Radar 数据
npm run radar:test       # 离线测试 Radar 流水线，不访问网络或模型
```

## 协作约定

开发者和 AI 协作者应先阅读 [docs/development-handbook.md](docs/development-handbook.md)。项目约定、已知迁移项、提交身份、提交信息格式和敏感信息扫描都记录在那里。

提交信息建议使用 `type: 中文说明`，例如：

```txt
docs: 更新 Radar 接口说明
fix: 修复邮箱验证过期判断
```

## Radar 接入

Radar 是独立信息系统，不是聊天助手，也不会自动伪装成人类发帖。它把公开互联网来源经过收集、标准化、去重、正文清洗、可选 LLM 语义增强、聚类和排序后形成外部 Signal，再通过主站 HTTP API 写入数据；它不直接连接主站数据库。

写入接口统一使用：

```txt
Authorization: Bearer $RADAR_SHARED_SECRET
```

关键接口：

- `POST /api/radar/heartbeat`
- `POST /api/radar/ingest`
- `GET /api/radar/tasks`
- `POST /api/radar/signals`
- `GET /api/observatory/stream`

接口契约见 [docs/radar-api.md](docs/radar-api.md)，系统拆分见 [docs/radar-architecture.md](docs/radar-architecture.md)。

LLM 只用于语义理解。关闭 `RADAR_LLM_ENABLED` 时，Radar 仍会继续执行抓取、标准化、精确去重、启发式摘要、分类和 Hybrid Ranking。

## Docker 部署

Compose 文件位于 `infra/docker/docker-compose.yml`：

```bash
cp .env.example .env
npm run compose:config
npm run compose:up
docker compose -f infra/docker/docker-compose.yml exec web npm run db:seed
```

容器默认只把 Web、PostgreSQL、Redis 和可选对象存储绑定到本机地址。公网入口应由反向代理或内网穿透服务统一暴露。

## 上线前检查

- 修改默认所有者邮箱、用户名和密码。
- 配置 `APP_URL` 为公网 HTTPS 地址。
- 配置 SMTP，并完成一次真实邮箱验证收信测试。
- 配置足够长的 `RADAR_SHARED_SECRET`。
- 如果启用 GitHub 来源，配置 `GITHUB_TOKEN` 以避免公开 API 速率限制。
- 确认 `data/uploads`、数据库和 `.env` 已纳入备份策略。
- 不提交 `.env`、`config/*.local.json`、上传文件、Radar 本地索引或模型文件。

## 设计原则

PARALLAX 是克制、开放、理性、带有研究机构气质的技术社区。页面优先依赖 typography、spacing、hierarchy 和 composition，不用无功能的状态面板、遥测、调试文本或多色栏目系统制造设计感。

更多说明见 [docs/design.md](docs/design.md) 和 [docs/architecture.md](docs/architecture.md)。
