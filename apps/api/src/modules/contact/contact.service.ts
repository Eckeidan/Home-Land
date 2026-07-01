import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { existsSync } from "node:fs";
import { join } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import type { ContactMessageDto } from "./contact.dto.js";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
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

  async send(input: ContactMessageDto): Promise<{ accepted: true }> {
    const to = process.env.CONTACT_TO_EMAIL ?? "chrismonga11@gmail.com";
    const from = process.env.EMAIL_FROM ?? "Asset Hub <notifications@thehomeland.local>";
    const safeName = this.escapeHtml(input.fullName);
    const safeEmail = this.escapeHtml(input.email);
    const safeSubject = this.escapeHtml(input.subject);
    const safeMessage = this.escapeHtml(input.message).replaceAll("\n", "<br />");
    const logoPath = this.resolveLogoPath();

    try {
      await this.transporter.sendMail({
        from,
        to,
        replyTo: input.email,
        subject: `Asset Hub contact: ${input.subject}`,
        text: `Name: ${input.fullName}\nEmail: ${input.email}\nSubject: ${input.subject}\n\n${input.message}`,
        html: this.renderContactEmail({
          safeEmail,
          safeMessage,
          safeName,
          safeSubject,
          withLogo: Boolean(logoPath),
        }),
        attachments: logoPath
          ? [{ cid: "asset-hub-logo", filename: "asset-hub-logo.png", path: logoPath }]
          : [],
      });
    } catch (error) {
      this.logger.error(
        `Contact email failed: ${error instanceof Error ? error.message : "unknown SMTP error"}`,
      );
      throw new ServiceUnavailableException("Contact email delivery failed");
    }

    return { accepted: true };
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ??
        character,
    );
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

  private renderContactEmail(input: {
    safeEmail: string;
    safeMessage: string;
    safeName: string;
    safeSubject: string;
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
    <title>Asset Hub contact</title>
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
                      <div style="color:#bfdbfe;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">New contact request</div>
                      <h1 style="margin:8px 0 0;color:#ffffff;font-size:30px;line-height:1.05;">Asset Hub message</h1>
                      <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;line-height:1.5;">Meta Global Vision Holding property operations platform</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 12px;">
                  <tr>
                    <td style="padding:16px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">
                      <div style="color:#64748b;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Full name</div>
                      <div style="margin-top:6px;color:#071a3d;font-size:18px;font-weight:900;">${input.safeName}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">
                      <div style="color:#64748b;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Email</div>
                      <a href="mailto:${input.safeEmail}" style="display:inline-block;margin-top:6px;color:#2f6fe6;font-size:17px;font-weight:900;text-decoration:none;">${input.safeEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">
                      <div style="color:#64748b;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Subject</div>
                      <div style="margin-top:6px;color:#071a3d;font-size:17px;font-weight:900;">${input.safeSubject}</div>
                    </td>
                  </tr>
                </table>
                <div style="margin-top:8px;padding:20px;border-radius:18px;background:#071a3d;color:#ffffff;">
                  <div style="color:#93c5fd;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Message</div>
                  <div style="margin-top:12px;color:#ffffff;font-size:16px;line-height:1.65;">${input.safeMessage}</div>
                </div>
                <a href="mailto:${input.safeEmail}?subject=Re:%20${input.safeSubject}" style="display:inline-block;margin-top:22px;border-radius:14px;background:#2f6fe6;color:#ffffff;padding:14px 18px;font-size:15px;font-weight:900;text-decoration:none;">Reply to this contact →</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fbff;color:#64748b;font-size:12px;line-height:1.5;">
                This message was sent from the Asset Hub website contact form. Reply directly to the sender before creating any operational account or organization.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
