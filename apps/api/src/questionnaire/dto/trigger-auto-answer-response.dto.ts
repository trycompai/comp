import { ApiProperty } from '@nestjs/swagger';

/**
 * Response of POST /v1/questionnaire/:id/auto-answer. Answer generation runs in
 * the background, so this returns immediately with a run handle and the current
 * counts. Clients (esp. MCP/agents) then poll GET /v1/questionnaire/:id and wait
 * for `answeredQuestions` to reach `totalQuestions`.
 */
export class TriggerAutoAnswerResponseDto {
  @ApiProperty({
    description: 'The questionnaire whose answers are being generated.',
    example: 'qst_6a179d26c4ad2c1c816ee16d',
  })
  questionnaireId!: string;

  @ApiProperty({
    description:
      'Background run identifier for the generation job (Trigger.dev run id).',
    example: 'run_cmpotsz153eac0ultc1ya87f5',
  })
  runId!: string;

  @ApiProperty({
    description:
      'Token for tracking the run via Trigger.dev realtime. Optional — MCP/agent clients should poll GET /v1/questionnaire/:id instead.',
    example: 'pat_...',
  })
  publicAccessToken!: string;

  @ApiProperty({
    description:
      "Always 'generating' on a successful trigger. Poll GET /v1/questionnaire/:id; answers are ready once answeredQuestions equals totalQuestions.",
    example: 'generating',
  })
  status!: string;

  @ApiProperty({
    description: 'Total number of questions in the questionnaire.',
    example: 23,
  })
  totalQuestions!: number;

  @ApiProperty({
    description:
      'Questions already answered at the moment generation was triggered (answers without a value are (re)generated).',
    example: 0,
  })
  answeredQuestions!: number;

  @ApiProperty({
    description: 'Human-readable summary of what to do next.',
    example:
      'Generating answers for 23 questions. Poll GET /v1/questionnaire/qst_... until answeredQuestions reaches totalQuestions.',
  })
  message!: string;
}
