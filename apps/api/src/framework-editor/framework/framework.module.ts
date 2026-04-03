import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { FrameworkExportService } from './framework-export.service';
import { FrameworkEditorFrameworkController } from './framework.controller';
import { FrameworkEditorFrameworkService } from './framework.service';

@Module({
  imports: [AuthModule],
  controllers: [FrameworkEditorFrameworkController],
  providers: [FrameworkEditorFrameworkService, FrameworkExportService],
  exports: [FrameworkEditorFrameworkService],
})
export class FrameworkEditorFrameworkModule {}
