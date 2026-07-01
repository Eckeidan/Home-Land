import { Injectable } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import type { InvitationalRole } from "../domain/organization.types.js";

@Injectable()
export class InvitationMailerService {
  private readonly transporter: Transporter;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number.parseInt(process.env.SMTP_PORT ?? "1025", 10),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: process.env.SMTP_REQUIRE_TLS === "true",
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async send(input: {
    email: string;
    token: string;
    organizationName: string;
    role: InvitationalRole;
  }): Promise<void> {
    const url = new URL(
      "/accept-invitation",
      process.env.APP_PUBLIC_URL ?? "http://localhost:3000",
    );
    url.searchParams.set("token", input.token);
    const organizationName = this.escapeHtml(input.organizationName);
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "The Home Land <notifications@thehomeland.local>",
      to: input.email,
      subject: `Join ${input.organizationName} on Asset Hub`,
      text: `You were invited to join ${input.organizationName} as ${input.role}. Accept: ${url.toString()}\n\nThis single-use invitation expires in 72 hours.`,
      html: `<p>You were invited to join <strong>${organizationName}</strong> as ${input.role}.</p><p><a href="${url.toString()}">Accept invitation</a></p><p>This single-use invitation expires in 72 hours.</p>`,
    });
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
