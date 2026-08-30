# 1Panel 部署说明

这个项目适合配合 1Panel 使用，但不会把部署细节藏在面板里。仓库里仍然保留 Docker Compose、环境变量示例、数据库迁移和部署文档，方便复现、迁移和社区协作。

## 推荐分工

1Panel 负责：

- Docker Compose 应用管理
- 反向代理
- HTTPS 证书
- 防火墙规则
- 定时备份
- 日志查看

代码仓库负责：

- `infra/docker/docker-compose.yml`
- `infra/docker/Dockerfile`
- `.env.example`
- Prisma 迁移
- 部署文档
- 应用代码和数据库模型

## 部署步骤

1. 在 Linux 主机上安装 Docker 和 1Panel。
2. 把项目放到稳定目录，例如 `/opt/parallax`。
3. 复制环境变量：

```bash
cp .env.example .env
```

4. 修改 `.env`：

```txt
APP_URL=https://你的域名
SEED_OWNER_EMAIL=你的邮箱
SEED_OWNER_PASSWORD=一个强密码
POSTGRES_PASSWORD=一个数据库强密码
MINIO_ROOT_PASSWORD=一个对象存储强密码
SMTP_HOST=你的 SMTP 服务器
SMTP_PORT=587
SMTP_USER=你的 SMTP 用户名
SMTP_PASSWORD=你的 SMTP 密码
SMTP_FROM=PARALLAX <noreply@你的域名>
RADAR_SHARED_SECRET=一个很长的随机字符串
RADAR_CONFIG_PATH=/app/config/radars.local.json
PARALLAX_BASE_URL=https://你的域名
```

5. 在 1Panel 里从本项目的 `infra/docker/docker-compose.yml` 创建 Compose 应用。
6. 启动应用。
7. 首次启动后执行一次数据库迁移：

```bash
docker compose -f infra/docker/docker-compose.yml exec web npm run db:deploy
```

8. 首次启动后执行一次种子脚本：

```bash
docker compose -f infra/docker/docker-compose.yml exec web npm run db:seed
```

9. 在 1Panel 里添加反向代理，把域名转发到：

```txt
http://127.0.0.1:3000
```

10. 在 1Panel 里开启 HTTPS。
11. 用一个真实邮箱注册新账号，确认可以收到验证邮件并完成登录。

默认不启动 MinIO，因为第一版上传文件直接落到本机磁盘。如果需要对象存储兼容层，再启用 `object-storage` profile。

## Radar 配置

Radar 的真实 key 不进入代码仓库。先复制示例配置：

```bash
cp config/radars.example.json config/radars.local.json
cp services/radar/config.local.example.json services/radar/config.local.json
```

然后在主站 `.env` 中填写 `RADAR_SHARED_SECRET`，再按需填写 `OPENAI_API_KEY`、`GITHUB_TOKEN` 等实际密钥。`config/radars.local.json` 只写环境变量名，例如：

```json
{
  "providers": {
    "openai": {
      "apiKeyEnv": "OPENAI_API_KEY"
    }
  }
}
```

`services/radar/config.local.json` 是 Radar 进程自己的采集配置，默认通过 HTTP 调用主站，不直接连接数据库。主站运行后，可以先试抓真实外部来源但不写库：

```bash
npm run radar:dry-run
```

确认配置后写入一次真实资料：

```bash
PARALLAX_BASE_URL=https://你的域名 npm run radar:once
```

如果先全部放在 Linux 主机上，可以用 1Panel 的进程守护、systemd 或 tmux 运行：

```bash
PARALLAX_BASE_URL=https://你的域名 npm run radar:run
```

迁移到具备 GPU 的 Linux 工作站时，复制 `services/radar/` 目录和 `package.json`，保持 `RADAR_SHARED_SECRET` 与主站一致，并把 `PARALLAX_BASE_URL` 指向主站公网或内网地址即可。

公网环境下，所有 Radar 写入接口都需要：

```txt
Authorization: Bearer 你的 RADAR_SHARED_SECRET
```

不要把 `config/radars.local.json`、`.env`、数据库、Redis 或 MinIO 控制台暴露到公网。

## 本地磁盘布局

上传文件挂载在：

```txt
./data/uploads
```

如果上传目录需要放到其他磁盘，可以把项目目录或 `data/uploads` 软链接放到大容量磁盘上。上传文件由应用从 `UPLOAD_DIR` 读取，并通过 `/uploads/...` 对外访问。

## 备份内容

至少备份：

- PostgreSQL 数据卷 `parallax_postgres`
- 上传目录 `./data/uploads`
- `.env`
- `config/radars.local.json`
- 如果启用 MinIO，备份 MinIO 数据卷 `parallax_minio`

公网部署时，不要把 PostgreSQL、Redis 或 MinIO 控制台直接暴露出去。需要管理它们时，优先通过 1Panel、SSH 隧道或内网访问。
