import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('/api/docs', 302)
  @ApiExcludeEndpoint() // Exclude this redirect from Swagger docs
  redirectToSwagger(): void {
    // This method redirects to Swagger documentation
  }
}
