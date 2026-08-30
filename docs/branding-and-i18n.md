# 品牌与多语言

PARALLAX 的品牌文案不应该散落在组件里。当前统一入口是：

```txt
apps/web/src/config/site.ts
```

默认品牌：

```txt
NEXT_PUBLIC_SITE_NAME=PARALLAX
NEXT_PUBLIC_SITE_LOCAL_NAME=视差社区
NEXT_PUBLIC_SITE_LOGO_TEXT=PX
NEXT_PUBLIC_SITE_LOCALE=zh-CN
NEXT_PUBLIC_RADAR_NAME=PARALLAX Radar
NEXT_PUBLIC_SITE_ACCENT="#ffd400"
NEXT_PUBLIC_HALO_ASSET=
```

`NEXT_PUBLIC_HALO_ASSET` 可指向一个公开静态资源路径，例如 `/brand/halo.webp`。为空时使用 CSS 绘制的默认光环。这样后续替换圆环形态时，不需要改组件结构。

服务端监控名：

```txt
SITE_SERVICE_NAME=parallax-community
```

Radar 调主站地址：

```txt
PARALLAX_BASE_URL=https://你的域名
```

## 当前策略

第一阶段不引入大型 i18n 框架，避免上线前增加路由、构建和翻译工作量。所有可复用站点文案先收进 `site.copy`：

- metadata 标题和描述
- Header 品牌和导航
- 首页 Hero
- 首页区块标题
- 登录、注册、验证邮件标题
- health service name

## 后续扩展

当需要英文版或更多语言时，再把 `apps/web/src/config/site.ts` 里的 `dictionaries` 拆到：

```txt
apps/web/src/i18n/messages/zh-CN.ts
apps/web/src/i18n/messages/en-US.ts
```

然后增加 locale 路由层：

```txt
apps/web/src/app/[locale]/
```

如果只需要后台文案多语言，继续使用 `site.copy` 即可；如果需要 SEO、多语言 URL、hreflang，再接入 `next-intl` 或同类方案。
