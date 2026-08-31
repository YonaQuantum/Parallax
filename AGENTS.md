<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PARALLAX 协作说明

这个仓库是中文技术社区 PARALLAX（视差社区）的开源本体。修改代码时请优先保持以下约定：

- 文档面向中文读者，新增项目文档默认使用中文。
- Web 源码统一放在 `apps/web/src/` 下，避免根目录平铺业务代码。
- Web 业务模块放在 `apps/web/src/features/<domain>`，服务端基础设施放在 `apps/web/src/server`。
- 自托管是一等公民，不要默认依赖云服务。
- 本地媒体优先放在 `data/uploads`，相关文件不进入 git。
- Node 开发环境优先使用 `.tools/node` 和 `.cache/npm`。
- 修改数据库模型时，同步更新 `packages/db/prisma` 下的 Prisma migration 和 `docs/architecture.md`。
- 修改部署方式时，同步更新 `docs/deployment-1panel.md`。
- 修改首页、Radar、领域入口和核心中文文案前，先阅读 `MEMORY.md` 与 `docs/product-memory.md`。
- 遇到新的开发坑、迁移折中、提交身份或隐私风险时，同步更新 `docs/development-handbook.md`。
- 插件、主题、内容块和平台集成应尽量通过清晰的扩展点进入系统。

## 提交约定

- 提交前确认 `git config user.name` 和 `git config user.email` 指向仓库维护者确认过的 GitHub 身份。
- 提交信息使用 Conventional Commits 类型，加中文说明，例如 `docs: 更新开发协作手册`。
- 不把真实成员资料、真实密钥、`.env`、上传文件、Radar 本地索引或模型文件提交到 Git。

## 界面设计原则

- PARALLAX 是克制、开放、理性、带有研究机构气质的技术社区。
- 页面首先依赖 typography、spacing、hierarchy、composition。
- 不为了填充空白而增加内容，留白是设计元素。
- 同一个信息只允许出现一次。
- 一个页面最多一个主强调色，PARALLAX Yellow 是默认强调色。
- 不用无实际功能的系统状态、Telemetry、Debug 文本作为装饰。
- 不使用六种颜色区分六个栏目。
- 如果一个组件删除后不影响用户理解，就删除。
- 默认选择更简单的方案。
