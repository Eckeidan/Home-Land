import { Module } from "@nestjs/common";
import { CreatePortfolioFoundationService } from "./application/create-portfolio-foundation.service.js";
import { GetPortfolioService } from "./application/get-portfolio.service.js";
import { PortfolioRepository } from "./infrastructure/portfolio.repository.js";
import { PortfolioController } from "./presentation/portfolio.controller.js";

@Module({
  controllers: [PortfolioController],
  providers: [CreatePortfolioFoundationService, GetPortfolioService, PortfolioRepository],
})
export class PortfolioModule {}
