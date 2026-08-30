import nodemailer from "nodemailer";
import { site } from "@/config/site";

type VerificationEmailInput = {
  to: string;
  name: string;
  verifyUrl: string;
};

export async function sendVerificationEmail(input: VerificationEmailInput) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured");
    }

    console.info(`[${site.copy.brand.name}] 验证邮件未发送，开发验证链接：${input.verifyUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  const safeName = escapeHtml(input.name);
  const safeVerifyUrl = escapeHtml(input.verifyUrl);

  await transporter.sendMail({
    from,
    to: input.to,
    subject: site.copy.auth.emailSubject,
    text: `${input.name}，请打开下面的链接完成邮箱验证：\n\n${input.verifyUrl}\n\n如果不是你本人操作，可以忽略这封邮件。`,
    html: `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; line-height: 1.7; color: #171717;">
        <h1 style="font-size: 20px;">${escapeHtml(site.copy.auth.emailHeading)}</h1>
        <p>${safeName}，请打开下面的链接完成邮箱验证：</p>
        <p><a href="${safeVerifyUrl}">${safeVerifyUrl}</a></p>
        <p style="color: #666;">如果不是你本人操作，可以忽略这封邮件。</p>
      </div>
    `
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
