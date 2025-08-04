import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [AuthModule, OrganizationModule, TasksModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
