import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { StripeGatewayService } from "./stripe-gateway.service.js";

const original = process.env.STRIPE_WEBHOOK_SECRET;
afterEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = original;
});
describe("Stripe webhook signatures", () => {
  it("accepts a current valid v1 signature", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const body = Buffer.from('{"id":"evt_test"}');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_test_secret")
      .update(`${timestamp}.`)
      .update(body)
      .digest("hex");
    expect(
      new StripeGatewayService().verifyWebhook(body, `t=${timestamp},v1=${signature}`),
    ).toEqual({ timestamp });
  });
  it("rejects tampered payloads", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const timestamp = Math.floor(Date.now() / 1000);
    expect(() =>
      new StripeGatewayService().verifyWebhook(
        Buffer.from("tampered"),
        `t=${timestamp},v1=${"0".repeat(64)}`,
      ),
    ).toThrow();
  });
  it("rejects replayed timestamps outside tolerance", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const body = Buffer.from("{}");
    const timestamp = Math.floor(Date.now() / 1000) - 301;
    const signature = createHmac("sha256", "whsec_test_secret")
      .update(`${timestamp}.`)
      .update(body)
      .digest("hex");
    expect(() =>
      new StripeGatewayService().verifyWebhook(body, `t=${timestamp},v1=${signature}`),
    ).toThrow();
  });
});
