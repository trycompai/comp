import { Module } from '@nestjs/common';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingEmailService } from './training-email.service';
import { TrainingCertificatePdfService } from './training-certificate-pdf.service';

@Module({
  controllers: [TrainingController],
  providers: [
    TrainingService,
    TrainingEmailService,
    TrainingCertificatePdfService,
  ],
  exports: [TrainingService, TrainingEmailService, TrainingCertificatePdfService],
})
export class TrainingModule {}
