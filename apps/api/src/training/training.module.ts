import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingEmailService } from './training-email.service';
import { TrainingCertificatePdfService } from './training-certificate-pdf.service';

@Module({
  imports: [AuthModule],
  controllers: [TrainingController],
  providers: [
    TrainingService,
    TrainingEmailService,
    TrainingCertificatePdfService,
  ],
  exports: [
    TrainingService,
    TrainingEmailService,
    TrainingCertificatePdfService,
  ],
})
export class TrainingModule {}
