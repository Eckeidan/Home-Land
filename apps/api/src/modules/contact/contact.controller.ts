import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { ContactMessageDto } from "./contact.dto.js";
import { ContactService } from "./contact.service.js";

@Controller("contact")
export class ContactController {
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  send(@Body() body: ContactMessageDto) {
    return this.contact.send(body);
  }
}
