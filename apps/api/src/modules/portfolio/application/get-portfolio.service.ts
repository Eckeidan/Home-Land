import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PortfolioRepository } from "../infrastructure/portfolio.repository.js";

@Injectable()
export class GetPortfolioService {
  constructor(@Inject(PortfolioRepository) private readonly repository: PortfolioRepository) {}

  async execute(organizationId: string, actorUserId: string) {
    const snapshot = await this.repository.getSnapshot(organizationId, actorUserId);
    if (!snapshot) {
      throw new NotFoundException({
        type: "/problems/portfolio",
        title: "Portfolio was not found",
        status: 404,
        code: "ORGANIZATION_NOT_FOUND",
      });
    }
    return snapshot;
  }
}
