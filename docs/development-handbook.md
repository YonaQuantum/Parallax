# 开发协作手册

这份文档面向所有开发者和 AI 协作者。它记录项目开发中容易反复遇到的问题、命名决策和提交约定，避免每次接手都重新推断上下文。

修改代码时，如果遇到新的坑、临时折中或需要后续迁移的事项，应同步更新本文档。没有记录的“口头约定”默认不算项目约定。

## 必须记录的情况

- 数据库 schema、migration、seed 行为发生变化。
- API 路径、鉴权方式、环境变量或部署方式发生变化。
- 前端信息架构、品牌文案、设计原则发生变化。
- 为了上线选择了阶段性折中，但未来需要迁移。
- 发现会影响其他开发者或 AI 判断的问题。
- 发现隐私、密钥、成员资料、上传文件可能进入仓库的风险。

## 当前约定

- 项目公开名称为 `PARALLAX`，中文名为“视差社区”。
- Web 应用位于 `apps/web`，当前 Next Route Handlers 同时承载主站 API。
- `apps/api` 是后续独立 API 服务边界，当前不作为运行入口。
- Radar 位于 `services/radar`，只通过 HTTP API 写入主站，不直接连接主站数据库。
- Prisma schema、migration 和 seed 位于 `packages/db/prisma`。
- 真实成员资料不进入仓库。成员应通过注册流程创建账号，seed 只初始化站点所有者和基础系统数据。
- `.env`、`config/*.local.json`、上传文件、Radar 本地索引和模型文件不得提交。
- `.env` 采用 dotenv 格式，不等同于 shell 脚本。带空格或中文的值应加引号；启动 Node 进程优先使用 `node --env-file=.env`、Next 自带环境加载或 Docker Compose，不要直接 `source .env`。
- Radar 外部摄入物和社区文章分属不同数据模型。清理旧资讯时只归档 `IngestedArtifact.deepArchivedAt`，不要删除或归档社区成员发布的 `Content`。前端展示短标题优先使用 `metadata.displayTitle`，原始来源标题保留在 `metadata.rawTitle`。

## 已知迁移项

### Prisma 内部早期命名

当前数据库模型和历史 migration 中仍存在少量 `Agent*` 命名。这是早期架构命名遗留，不代表前台产品要做聊天助手。

公开产品和服务边界统一使用 `Radar`：

- 对外文档使用 Radar。
- 前端文案使用 Radar 或 Signal。
- 新 API 路径优先使用 `/api/radar/*`。
- 不在新代码中继续引入 `Agent*` 作为产品概念。

如果要彻底改名，应单独做数据库 migration，并评估已有数据、Prisma Client 类型、API 兼容和部署窗口。不要在普通功能提交里直接重命名历史表。

### Git 提交身份

提交前必须确认本仓库的 Git 作者信息。若没有配置，GitHub 会显示成本机默认身份或临时维护者身份，导致提交无法归属到仓库维护者账号。

当前推荐配置为：

```bash
git config user.name "CrotAA"
git config user.email "CrotAA@users.noreply.github.com"
```

如果 GitHub 页面仍不能把提交归属到账号，需要在 GitHub 的 Email settings 中复制准确的 no-reply 邮箱，再更新本地仓库配置。

已经被他人 clone 或 fork 的公开历史不应随意重写。只有在仓库刚初始化、确认没有协作者基于旧历史工作时，才可以修正提交作者并 force push。

## 提交信息规范

提交标题使用 Conventional Commits 类型，加中文说明：

```txt
feat: 增加内容发布草稿
fix: 修复邮箱验证过期判断
docs: 更新 Radar 接口说明
chore: 调整 monorepo 脚本
```

常用类型：

- `feat`：用户可感知的新功能。
- `fix`：缺陷修复。
- `docs`：文档变更。
- `style`：不影响行为的样式调整。
- `refactor`：不改变外部行为的代码重构。
- `test`：测试相关。
- `chore`：构建、脚本、依赖、仓库维护。

提交正文可以继续使用中文。涉及上线风险时，应写明验证方式和剩余风险。

## 开发前检查

开始修改前先确认：

```bash
git status --short --branch
```

涉及 Next.js 行为时，先阅读 `node_modules/next/dist/docs/` 中对应文档，因为当前 Next 版本与旧经验存在差异。

涉及数据库时，必须同步考虑：

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations`
- `packages/db/prisma/seed.ts`
- `docs/architecture.md`

涉及部署时，必须同步考虑：

- `.env.example`
- `infra/docker/docker-compose.yml`
- `infra/docker/Dockerfile`
- `docs/deployment-1panel.md`

## 上线前敏感信息扫描

提交前至少执行一次敏感信息扫描。扫描词应包含但不限于：

- 私人硬件型号和容量描述。
- 临时账号、密码、验证码。
- 旧品牌名和旧环境变量名。
- 真实成员姓名、昵称、邮箱和头像路径。
- 本地绝对路径、私有域名、内网地址。

推荐用本地临时命令执行，不把具体私人词汇写入仓库文档。

该命令只是基础兜底，不能替代人工审核。任何真实密钥、真实成员资料、真实上传内容都不能进入 Git。

## 推荐验证命令

常规代码变更：

```bash
npm run lint
npm run build
```

数据库变更：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

部署变更：

```bash
npm run compose:config
docker build -f infra/docker/Dockerfile -t parallax-monorepo-check .
```

Radar 变更：

```bash
npm run radar:test
npm run radar:dry-run
```

如果某个验证因为外部服务限流或缺少密钥无法完成，应在提交说明或 PR 描述中写清楚。
