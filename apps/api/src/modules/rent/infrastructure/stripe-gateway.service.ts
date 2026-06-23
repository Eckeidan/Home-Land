import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class StripeGatewayService {
  async createPaymentIntent(input: {
    amountMinor: number;
    idempotencyKey: string;
    organizationId: string;
  }): Promise<{ id: string; clientSecret: string; status: string }> {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret?.startsWith("sk_test_"))
      throw new ServiceUnavailableException({
        type: "/problems/stripe",
        title: "Stripe sandbox is not configured",
        status: 503,
        code: "STRIPE_SANDBOX_NOT_CONFIGURED",
      });
    const body = new URLSearchParams({
      amount: String(input.amountMinor),
      currency: "usd",
      "automatic_payment_methods[enabled]": "true",
      "metadata[organization_id]": input.organizationId,
    });
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": input.idempotencyKey,
      },
      body,
    });
    const payload = (await response.json()) as {
      id?: string;
      client_secret?: string;
      status?: string;
      error?: { message?: string };
    };
    if (!response.ok || !payload.id || !payload.client_secret || !payload.status)
      throw new ServiceUnavailableException({
        type: "/problems/stripe",
        title: "Stripe sandbox rejected the payment intent",
        status: 503,
        code: "STRIPE_INTENT_FAILED",
      });
    return { id: payload.id, clientSecret: payload.client_secret, status: payload.status };
  }

  verifyWebhook(rawBody: Buffer, signatureHeader?: string): { timestamp: number } {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret?.startsWith("whsec_"))
      throw new ServiceUnavailableException({
        type: "/problems/stripe",
        title: "Stripe webhook is not configured",
        status: 503,
        code: "STRIPE_WEBHOOK_NOT_CONFIGURED",
      });
    const parts = (signatureHeader ?? "").split(",").map((part) => part.split("=", 2));
    const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
    const signatures = parts
      .filter(([key]) => key === "v1")
      .map(([, value]) => value)
      .filter((value): value is string => Boolean(value));
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300)
      throw new UnauthorizedException({
        type: "/problems/stripe",
        title: "Webhook signature is invalid",
        status: 401,
        code: "STRIPE_SIGNATURE_INVALID",
      });
    const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
    const valid = signatures.some((signature) => {
      try {
        const candidate = Buffer.from(signature, "hex");
        return candidate.length === expected.length && timingSafeEqual(candidate, expected);
      } catch {
        return false;
      }
    });
    if (!valid)
      throw new UnauthorizedException({
        type: "/problems/stripe",
        title: "Webhook signature is invalid",
        status: 401,
        code: "STRIPE_SIGNATURE_INVALID",
      });
    return { timestamp };
  }
}
