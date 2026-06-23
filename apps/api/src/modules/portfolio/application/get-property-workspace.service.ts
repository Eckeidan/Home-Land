import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PortfolioRepository } from "../infrastructure/portfolio.repository.js";

@Injectable()
export class GetPropertyWorkspaceService {
  constructor(@Inject(PortfolioRepository) private readonly repository: PortfolioRepository) {}

  async execute(organizationId: string, propertyId: string, actorUserId: string) {
    const workspace = await this.repository.getPropertyWorkspace(
      organizationId,
      propertyId,
      actorUserId,
    );
    if (!workspace) {
      throw new NotFoundException({
        type: "/problems/portfolio",
        title: "Property was not found",
        status: 404,
        code: "PROPERTY_NOT_FOUND",
      });
    }
    return workspace;
  }
}
