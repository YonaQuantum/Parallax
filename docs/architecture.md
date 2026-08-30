# 架构说明

PARALLAX 第一版采用模块化单体。这样可以让单台 Linux 主机部署保持简单，同时为未来拆分服务、插件运行时和独立搜索保留边界。

## 核心模块

- 身份：用户、角色、邮箱验证、数据库会话、身份卡
- 内容：文章、文档、视频、图文、发布状态、正文格式
- 社区：评论、点赞、收藏、通知
- 媒体：本地文件优先，后续支持 S3 兼容对象存储
- 图谱：内容关系、引用、系列路径和知识延展
- PARALLAX Radar：工作记忆、外部资料摄入、任务节流、World Signals
- 扩展：插件 manifest、扩展槽、权限声明、启停状态

## Monorepo 分层

```txt
apps/web/              Next.js Web 应用；当前也承载 /api/* Route Handlers
apps/api/              独立 API 服务预留边界
services/radar/        外部世界到社区 Signal 的信息系统
packages/db/prisma/    数据库 schema、migration、seed
packages/ui/           共享 UI 包预留
packages/types/        共享类型
packages/config/       共享配置预留
infra/docker/          Dockerfile 和 Docker Compose
infra/deploy/          部署资料预留
docs/                  中文项目文档
```

Web 应用内部分层：

```txt
apps/web/src/app/       Web 路由、页面、API 入口
apps/web/src/features/  Web 业务功能模块，例如内容、讨论、插件
apps/web/src/server/    只在服务端运行的认证、数据库、存储、队列逻辑
apps/web/src/shared/    无业务副作用的通用工具
```

约定：

- `apps/web/src/app` 只做入口编排，不堆业务实现。
- `apps/web/src/features` 按业务域命名，不按技术类型堆成 `helpers`、`common`。
- `apps/web/src/server` 放不能进浏览器的代码，例如 Prisma、文件系统、密钥、队列。
- `apps/web/src/shared` 只放足够稳定、低耦合的复用工具。

## 存储策略

第一版使用本地磁盘保存上传文件：

```txt
./data/uploads -> /app/data/uploads
```

这很适合带大容量 SSD 的主机。数据库里的 `MediaFile` 表只保存文件元数据，文件本体放在磁盘上。后续如果访问量变大，可以把同一套元数据指向 MinIO、Cloudflare R2、阿里云 OSS 或其他 S3 兼容存储。

`UPLOAD_DIR` 下的文件会通过 `/uploads/...` 读取，并做路径穿越保护。

## 数据模型

主要模型：

- `User`：用户、主理人、版主和普通成员
- `IdentityCard`：身份卡、展示编号、短码、卡面样式和成员主页资料
- `EmailVerificationToken`：邮箱验证 token 的哈希、过期时间和使用状态
- `Account` / `Session`：外部账号绑定与服务端数据库会话，浏览器只保存随机 session cookie
- `UserExternalProject`：用户明确选择展示的外部项目，例如 GitHub 仓库；不和公共 Radar 信息流混用
- `Content`：文章、文档、视频、图文动态
- `ContentRelation`：内容之间的引用、延展、相关和系列关系
- `Tag` / `ContentTag`：标签与内容关联
- `Comment`：评论和楼中楼
- `Reaction`：点赞、感谢、有启发
- `Bookmark`：收藏
- `MediaFile`：上传文件元数据
- `Notification`：站内通知
- `CommunityExtension`：社区扩展声明
- `AgentResident`：Radar 实例，记录 slug、权限范围、心跳和状态
- `AgentMemory`：Radar 工作记忆、温层记忆和深层归档
- `DomainClock`：六大板块的独立心跳：编程与开源、AI 与模型、游戏与交互、硬件与嵌入式、创作与媒体、科学与宇宙
- `CanvasSnapshot`：用户个人探索画布的周期性锚点快照
- `KnowledgeSource` / `IngestedArtifact`：外部资料来源和摄入成果；同一 Radar 的同一外部 ID 只保留一条记录，避免 Radar 重复刷屏
- `IngestedArtifactTag`：外部摄入条目与统一 `Tag` 词表的关联；社区内容和外部资讯共用标签名，但关联关系分离
- `KnowledgeStream`：摄入资料拆出的语法流、符号流、语义流等异构流
- `DerivedSkeleton`：给前端/GPU 使用的降维骨架数据
- `AgentTask`：可降级、可挂起的 Radar 后台任务
- `AgentResourceSample`：本地负载采样和后端节流建议
- `AgentSignal`：World Signals、新知到达、灰色干扰和需要人类接管的外部变化

`ContentRelation` 是未来内容关系能力的基础。它不把知识只放进分类树，而是允许一篇内容指向另一篇内容：

- `REFERENCES`：引用或依赖
- `BUILDS_ON`：延展或进阶
- `RELATED`：相关主题
- `SERIES_NEXT`：系列顺序

当前交付版前台不使用节点连线图，`/map` 已改为观测台：展示真实 World Signals 和研究队列。首页在有真实外部信号或社区新内容时显示 `New`，没有真实条目时不渲染占位区。后续如果重新需要关系视图，可以在编辑器里加“关联内容”面板，让作者发布时顺手建立关系。

## PARALLAX Radar

PARALLAX Radar 不作为前台 AI 助手出现，而是社区的后台信息循环系统。它从 GitHub、arXiv、技术博客、游戏圈、AI 圈、开源模型、硬件项目、创作工具、科学发现、宇宙生命和哲学探索中捕捉真实变化，再把值得人类接管的 Signal 写回主站。公网部署时，Radar 写入接口必须带：

Radar 架构、新首页 `New` 信息流、标签系统和 GitHub 绑定的拆分方案见 `docs/radar-architecture.md`。

```txt
Authorization: Bearer $RADAR_SHARED_SECRET
```

现有 API 边界：

- `GET /api/radar/config?slug=...`：读取本地 `config/radars.local.json` 中的 Radar 配置，只返回 provider 字段名，不返回真实 key。
- `POST /api/radar/heartbeat`：写入心跳和资源采样；当负载过高时，后端会挂起低优先级队列任务。
- `GET/POST /api/radar/memory`：读取和冻结 Radar 注意力焦点，支持工作层、温层和深层归档。
- `POST /api/radar/ingest`：摄入外部资料，按领域分类并拆为语法流、符号流、语义流，同时生成骨架和热度。
- `GET/POST/PATCH /api/radar/tasks`：拉取、创建、更新 Radar 任务；用户创建任务需要主理人或版主身份，Radar 更新任务需要共享密钥。
- `GET/POST /api/radar/signals`：读取公开信号，或由 Radar 写入新知、警告、灰色干扰提示。
- `GET /api/observatory/stream`：给首页和观测台读取热力图、领域时钟、World Signals 和可展示的摄入成果。
- `GET/PUT /api/workspace/snapshots`：保存登录用户的个人画布锚点，采用后提交覆盖策略。

这层目前只做“信息循环”：保存记忆、控制节奏、筛出噪声、提供带来源的 World Signals。它不自动发帖，不冒充用户，不替代人的创作。等真实资料量上来后，可以把 `KnowledgeStream` 和 `DerivedSkeleton` 迁往专门的检索服务。

### 领域模型

`KnowledgeDomain` 当前只保留 PARALLAX 第一版的六个一级板块：

- `CODE`：编程与开源
- `AI_MODELS`：AI 与模型
- `GAME_INTERACTION`：游戏与交互
- `HARDWARE_EMBEDDED`：硬件与嵌入式
- `CREATIVE_MEDIA`：创作与媒体
- `SCIENCE_COSMOS`：科学与宇宙

`GENERAL` 只作为兜底域，不作为首页一级入口。旧的渲染、音乐、光谱科学、宇宙哲学会被归并进这些一级板块，再通过标签和正文关联表达交叉性。

### LLM 判断边界

上线第一阶段不让大模型成为摄入链路的硬依赖。Radar 的基础判断由资料源配置、关键词规则、来源可信度、去重和热度衰减完成；LLM 只作为增强层，用于生成摘要、提炼“为什么值得看”、跨领域标签和人工接管建议。这样即使 GPU 工作站或外部模型服务暂时不可用，首页也不会断流。

## 身份卡

身份卡已经作为用户身份层进入数据库，而不是作为根目录里的静态素材存在。

- `serial`：展示编号，例如 `PX-0001`
- `code`：随机短码，当前生成格式为 `XXXX-XXXX-XXXX`
- `generationVersion`：记录生成算法版本，方便以后升级或兼容历史卡
- `cardVariant`：`MOON` 表示初创成员月光卡，`WHITE` 表示普通成员白卡
- `status`：预留、已认领、暂停
- `userId`：和用户一对一绑定，可支持“先发卡后认领”

种子脚本位于 `packages/db/prisma/seed.ts`，只初始化站点所有者和基础领域时钟。普通注册用户会自动生成新的 身份卡和白卡。真实成员资料不进入开源仓库。

## 认证与邮箱验证

当前认证是自托管数据库 session：

- 注册写入 `User`、生成标准白卡 `IdentityCard`，再发送邮箱验证邮件。
- 登录同时校验密码和 `emailVerified`，未验证邮箱不能登录。
- session cookie 只保存随机 token，数据库保存 SHA-256 哈希。
- 生产环境必须配置 SMTP，否则注册后无法完成真实邮件验证。

## 插件方向

`CommunityExtension` 目前故意保持很小：

- `manifest`：JSON 格式的扩展槽和权限声明
- `status`：提案、启用、禁用
- `author`：扩展维护者

优先考虑的扩展槽：

- `editor.block`：编辑器内容块
- `content.render`：内容渲染扩展
- `profile.widget`：个人主页组件
- `navigation.item`：导航入口
- `integration.sync`：外部平台同步

## 部署边界

单机部署结构：

```txt
1Panel / Nginx / 内网穿透
  -> web:3000
  -> postgres:5432
  -> redis:6379
  -> minio:9000/9001
```

公网只应该暴露反向代理或穿透入口。Compose 文件默认把服务端口绑定到 `127.0.0.1`，数据库、Redis 和 MinIO 控制台不要直接暴露到公网。
