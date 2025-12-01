import { Module } from '@nestjs/common';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';

@Module({
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService]
})
export class QuestionnaireModule {}
