import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';
import { TrustPortalModule } from '../trust-portal/trust-portal.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [AuthModule, TrustPortalModule, UploadsModule],
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService],
})
export class QuestionnaireModule {}
