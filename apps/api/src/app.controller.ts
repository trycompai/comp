import { Controller, Get, Redirect, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('/api/docs', 302)
  @ApiExcludeEndpoint() // Exclude this redirect from Swagger docs
  redirectToSwagger(): void {
    // This method redirects to Swagger documentation
  }
}
