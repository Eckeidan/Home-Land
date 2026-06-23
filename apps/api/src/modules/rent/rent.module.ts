import { Module } from "@nestjs/common";
import { RentService } from "./application/rent.service.js";
import { StripeService } from "./application/stripe.service.js";
import { RentRepository } from "./infrastructure/rent.repository.js";
import { StripeRepository } from "./infrastructure/stripe.repository.js";
import { StripeGatewayService } from "./infrastructure/stripe-gateway.service.js";
import { RentController } from "./presentation/rent.controller.js";
import {
  StripeIntentController,
  StripeWebhookController,
} from "./presentation/stripe.controller.js";
@Module({
  controllers: [RentController, StripeIntentController, StripeWebhookController],
  providers: [RentService, StripeService, RentRepository, StripeRepository, StripeGatewayService],
})
export class RentModule {}
