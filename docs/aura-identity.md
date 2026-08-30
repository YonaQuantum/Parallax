# AURA 身份证

AURA 身份证是 PARALLAX 的社区身份层。它不是登录系统的替代品，而是绑定在账号旁边的公开身份、卡面和成员主页入口。

## 为什么做进系统

原始 AURA 生成器使用 Python 和 JSON 保存随机短码。这个方式适合早期制卡，但不适合真实社区上线：

- 不能和用户注册、邮箱验证、权限、个人主页形成事务一致性。
- JSON 文件不方便多人协作和后台管理。
- 很难避免未来注册用户和历史卡短码冲突。

现在的做法是把 AURA 写入 `AuraIdentity` 表。用户注册时自动创建一张普通白卡；种子脚本只初始化站点所有者，不在开源仓库中携带真实成员资料。

## 短码规则

当前新短码格式：

```txt
XXXX-XXXX-XXXX
```

字符表：

```txt
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

这个字符表避开了容易混淆的 `I`、`O`、`0`、`1`。生成逻辑在 `apps/web/src/features/aura/id.ts` 和 `packages/db/prisma/seed.ts`，使用 `node:crypto` 的随机数，并在数据库里检查唯一性。

## 历史卡兼容

已经发出的历史卡面和短码以真实数据为准。开源仓库不保存这些资料；生产部署可通过私有配置、后台功能或一次性导入脚本写入。

数据库通过 `generationVersion` 记录来源：

- `aura-id-tool-v0`：现行生成器规则
- `legacy-card-watermark`：历史卡面水印或早期规则

后续如果算法升级，只需要新增版本号，不需要修改旧身份。

## 卡面类型

`cardVariant` 控制展示风格：

- `MOON`：初创成员月光卡，由生产环境的私有配置或后台数据决定。
- `WHITE`：普通成员白卡，使用系统样式生成，不依赖月光背景。

初创成员是否属于特殊身份由 `isFounder` 表示，不靠文件名或前端硬编码判断。

## 账号关系

`AuraIdentity.userId` 和 `User.id` 是一对一关系。

支持两种模式：

- 注册即认领：普通用户注册并验证邮箱后，自动拥有白卡。
- 预留后认领：提前创建 AURA 身份，后续再绑定邮箱账号。

当前种子脚本只根据 `.env` 创建站点所有者账号和一张 AURA 月光卡。其他成员身份应通过注册、邀请、后台导入或私有运维脚本创建。

## 上线检查

上线前至少确认：

- `npm run db:deploy` 已应用包含 `AuraIdentity` 和 `EmailVerificationToken` 的 migration。
- `npm run db:seed` 已初始化站点所有者。
- `/members` 能看到成员目录。
- 站点所有者个人页能通过 `SEED_OWNER_HANDLE` 打开。
- 新注册用户完成邮箱验证后能获得白卡并登录。
