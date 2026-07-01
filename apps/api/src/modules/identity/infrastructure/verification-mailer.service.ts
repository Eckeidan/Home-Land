import { Injectable } from "@nestjs/common";
import { existsSync } from "node:fs";
import { join } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import type { VerificationDelivery } from "../domain/identity.types.js";

@Injectable()
export class VerificationMailerService {
  private readonly transporter: Transporter;

  constructor() {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD?.trim();
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number.parseInt(process.env.SMTP_PORT ?? "1025", 10),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: process.env.SMTP_REQUIRE_TLS === "true",
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
      tls: { minVersion: "TLSv1.2" },
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async sendVerification({ email, temporaryPassword, token }: VerificationDelivery): Promise<void> {
    const appUrl = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";
    const verificationUrl = new URL("/verify-email", appUrl);
    verificationUrl.searchParams.set("token", token);
    const logoPath = this.resolveLogoPath();

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "Asset Hub <notifications@thehomeland.local>",
      to: email,
      subject: "Your Asset Hub account access",
      text: `Welcome to Asset Hub.\n\nVerify your account: ${verificationUrl.toString()}\nTemporary password: ${temporaryPassword}\n\nThis link expires in 30 minutes. Change this password after your first sign in. If you did not request this account, ignore this email.`,
      html: this.renderVerificationEmail({
        email,
        temporaryPassword,
        verificationUrl: verificationUrl.toString(),
        withLogo: Boolean(logoPath),
      }),
      attachments: logoPath
        ? [{ cid: "asset-hub-logo", filename: "asset-hub-logo.png", path: logoPath }]
        : [],
    });
  }

  private resolveLogoPath(): string | null {
    const candidates = [
      join(process.cwd(), "apps/web/public/logo.png"),
      join(process.cwd(), "../web/public/logo.png"),
      join(process.cwd(), "../../apps/web/public/logo.png"),
      join(process.cwd(), "public/logo.png"),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  private renderVerificationEmail(input: {
    email: string;
    temporaryPassword: string;
    verificationUrl: string;
    withLogo: boolean;
  }): string {
    const logo = input.withLogo
      ? '<img src="cid:asset-hub-logo" width="72" height="72" alt="Asset Hub" style="display:block;border-radius:16px;background:#ffffff;" />'
      : '<div style="width:72px;height:72px;border-radius:16px;background:#2f6fe6;color:#ffffff;display:grid;place-items:center;font-weight:900;font-size:24px;">AH</div>';

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Asset Hub account access</title>
  </head>
  <body style="margin:0;background:#eef4ff;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#071a3d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:collapse;border-radius:28px;overflow:hidden;background:#ffffff;box-shadow:0 24px 70px rgba(7,26,61,0.16);">
            <tr>
              <td style="padding:28px;background:linear-gradient(135deg,#071a3d,#123f7a 58%,#2f6fe6);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="width:84px;vertical-align:middle;">${logo}</td>
                    <td style="vertical-align:middle;">
                      <div style="color:#bfdbfe;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Secure owner foundation</div>
                      <h1 style="margin:8px 0 0;color:#ffffff;font-size:30px;line-height:1.05;">Welcome to Asset Hub</h1>
                      <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;line-height:1.5;">Meta Global Vision Holding property operations platform</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.65;">Your Asset Hub owner account has been prepared. Verify your email, then sign in with the temporary password below.</p>
                <div style="padding:18px;border:1px solid #dbeafe;border-radius:18px;background:#f8fbff;">
                  <div style="color:#64748b;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Account email</div>
                  <div style="margin-top:8px;color:#071a3d;font-size:18px;font-weight:900;">${this.escapeHtml(input.email)}</div>
                </div>
                <div style="margin-top:14px;padding:18px;border-radius:18px;background:#071a3d;color:#ffffff;">
                  <div style="color:#93c5fd;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Temporary password</div>
                  <div style="margin-top:10px;font-family:Consolas,Monaco,monospace;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:1px;">${this.escapeHtml(input.temporaryPassword)}</div>
                  <p style="margin:10px 0 0;color:#bfdbfe;font-size:13px;line-height:1.5;">Change this password after your first sign in.</p>
                </div>
                <a href="${input.verificationUrl}" style="display:inline-block;margin-top:22px;border-radius:14px;background:#2f6fe6;color:#ffffff;padding:15px 20px;font-size:15px;font-weight:900;text-decoration:none;">Verify account →</a>
                <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.55;">This verification link expires in 30 minutes. If you did not request this account, ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fbff;color:#64748b;font-size:12px;line-height:1.5;">
                Asset Hub never asks for your password by phone or chat. Keep this email private.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ??
        character,
    );
  }
}
