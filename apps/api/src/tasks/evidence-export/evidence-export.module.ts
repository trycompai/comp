import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TasksModule } from '../tasks.module';
import { EvidenceExportService } from './evidence-export.service';
import {
  EvidenceExportController,
  AuditorEvidenceExportController,
} from './evidence-export.controller';

@Module({
  imports: [AuthModule, forwardRef(() => TasksModule)],
  controllers: [EvidenceExportController, AuditorEvidenceExportController],
  providers: [EvidenceExportService],
  exports: [EvidenceExportService],
})
export class EvidenceExportModule {}
