import { Injectable } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import type { VerificationDelivery } from "../domain/identity.types.js";

@Injectable()
export class VerificationMailerService {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number.parseInt(process.env.SMTP_PORT ?? "1025", 10),
      secure: false,
    });
  }

  async sendVerification({ email, token }: VerificationDelivery): Promise<void> {
    const appUrl = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";
    const verificationUrl = new URL("/verify-email", appUrl);
    verificationUrl.searchParams.set("token", token);

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "The Home Land <notifications@thehomeland.local>",
      to: email,
      subject: "Verify your The Home Land account",
      text: `Verify your account: ${verificationUrl.toString()}\n\nThis link expires in 30 minutes. If you did not request this account, ignore this email.`,
      html: `<p>Verify your The Home Land account:</p><p><a href="${verificationUrl.toString()}">Verify account</a></p><p>This link expires in 30 minutes. If you did not request this account, ignore this email.</p>`,
    });
  }
}
