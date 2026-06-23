import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";

@Injectable()
export class TenantInvitationMailerService {
  async send(input: { email: string; token: string; organizationName: string }): Promise<void> {
    const url = new URL(
      "/accept-tenant-invitation",
      process.env.APP_PUBLIC_URL ?? "http://localhost:3000",
    );
    url.searchParams.set("token", input.token);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "The Home Land <notifications@thehomeland.local>",
      to: input.email,
      subject: `Tenant invitation from ${input.organizationName}`,
      text: `Accept your single-use tenant invitation: ${url.toString()}\nThis link expires in 72 hours.`,
    });
  }
}
