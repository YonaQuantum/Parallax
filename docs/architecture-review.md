# 架构评审

这份评审按成熟应用和开源项目角度判断当前状态。当前项目已经不是纯前端：它包含数据库模型、迁移、认证、邮箱验证、本地存储、身份卡层、Radar 摄入接口和 Docker 编排。它仍然是第一阶段产品，距离完整社区系统还需要补齐审核、权限、搜索、限流、备份和测试。

## 当前完成度

已完成：

- Monorepo：`apps/`、`services/`、`packages/`、`infra/`、`docs/` 边界已建立。
- Web 应用：Next.js App Router、TypeScript、Tailwind、ESLint。
- API：当前由 `apps/web/src/app/api` 承载，后续可迁移到 `apps/api`。
- 数据库：Prisma schema、migration、seed 已移动到 `packages/db/prisma`。
- 认证：数据库 session、注册、登录、密码哈希、邮箱验证。
- 内容：发布内容写库，首页、探索页、详情页读取真实数据。
- 交流：内容详情页评论展示和登录用户评论发布。
- 存储：本地上传目录、上传写盘、媒体元数据、`/uploads/...` 读取路由、路径穿越保护。
- 身份：身份卡、成员目录、个人主页；开源仓库不携带真实成员资料。
- Radar：`/api/radar/*`、`/api/observatory/stream`、真实外部来源摄入、标签落库、去重和公开 Signal。
- 部署：`infra/docker/Dockerfile`、`infra/docker/docker-compose.yml`、PostgreSQL、Redis、可选 MinIO。
- 开源：README、贡献指南、许可证、中文架构和部署文档。

尚未完成：

- 内容编辑、删除、草稿恢复、审核流和版本记录。
- 完整权限策略：OWNER、MODERATOR、MEMBER 的能力边界还需要系统化。
- 上传治理：配额、文件哈希、病毒扫描、后台清理、断点续传。
- 搜索：PostgreSQL 全文搜索或独立搜索服务尚未接入。
- 观测：结构化日志、错误上报、指标、备份和恢复演练。
- 自动化测试：注册、登录、发布、评论、上传、Radar 写入都需要测试覆盖。
- GitHub OAuth：模型已预留，绑定流程和个人项目同步页面尚未完成。

## Monorepo 评价

当前拆分是合理的：

```txt
apps/web              当前 Web 与 Route Handlers
apps/api              独立 API 服务预留
services/radar        外部信息系统
packages/db           Prisma schema / migration / seed
packages/ui           共享 UI 预留
packages/types        共享类型
packages/config       共享配置预留
infra/docker          容器化部署
infra/deploy          部署资料预留
```

这个结构的好处是：

- 主站和 Radar 不互相 import，未来可以独立部署。
- 数据库资产集中在 `packages/db`，迁移和 seed 不散落在应用里。
- Web 应用仍可单独启动，第一阶段部署复杂度可控。
- 后续抽离 `apps/api` 时，不需要重新设计仓库边界。
- 共享类型和 UI 包已经有位置，但当前不强行抽象，避免过早复杂化。

## 企业级风险

- Prisma 内部仍有少量早期命名需要通过独立 migration 清理；当前公开接口和服务边界已经统一为 Radar。
- `apps/api` 目前是服务边界预留，不是独立运行服务。第一阶段这是可接受折中，但文档必须说清楚。
- 根 `.env` 由 Web 配置加载；部署时应确保容器环境变量与 `.env.example` 一致。
- 公开仓库不应包含真实成员资料、私有图片、真实密钥、本地配置或上传文件。

## 下一步顺序

1. 配置 SMTP 并完成真实邮箱验证收信测试。
2. 增加内容编辑、删除、草稿、审核和版本记录。
3. 增加注册、登录、上传、Radar 写入的限流。
4. 增加 GitHub OAuth、用户选择公开仓库和个人页同步。
5. 增加 Postgres 全文搜索或独立搜索服务。
6. 增加备份脚本、恢复文档和日志轮转。
7. 增加自动化测试，优先覆盖上线关键路径。

## 结论

当前 monorepo 结构适合开源共建和第一阶段上线。它保留了单机部署的简单性，同时把 Web、API、Radar、数据库、共享包和基础设施分到了清晰边界。下一步重点不应继续扩页面，而应补齐生产治理能力。
