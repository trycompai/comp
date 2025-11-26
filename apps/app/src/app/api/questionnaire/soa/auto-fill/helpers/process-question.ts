import { generateSOAAnswerWithRAG } from '@/app/(app)/[orgId]/questionnaire/soa/utils/generate-soa-answer';
import { logger } from '@/utils/logger';

type Question = {
  id: string;
  text: string;
  columnMapping: {
    closure: string;
    title: string;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification: string | null;
  };
};

type ProcessResult = {
  questionId: string;
  isApplicable: boolean | null;
  justification: string | null;
  success: boolean;
  insufficientData: boolean;
};

type SendFunction = (data: {
  type: string;
  questionId?: string;
  questionIndex?: number;
  isApplicable?: boolean | null;
  justification?: string | null;
  success?: boolean;
  insufficientData?: boolean;
}) => void;

export async function processQuestion(
  question: Question,
  index: number,
  organizationId: string,
  isFullyRemote: boolean,
  send: SendFunction,
): Promise<ProcessResult> {
  const controlClosure = question.columnMapping.closure || '';
  const isControl7 = controlClosure.startsWith('7.');

  // If fully remote and control starts with "7.", skip generation and return NO
  if (isFullyRemote && isControl7) {
    send({
      type: 'answer',
      questionId: question.id,
      questionIndex: index,
      isApplicable: false,
      justification: 'This control is not applicable as our organization operates fully remotely.',
      success: true,
      insufficientData: false,
    });

    return {
      questionId: question.id,
      isApplicable: false,
      justification: 'This control is not applicable as our organization operates fully remotely.',
      success: true,
      insufficientData: false,
    };
  }

  // Single generation request that returns both isApplicable and justification
  const soaQuestion = `Analyze the control "${question.columnMapping.title}" (${question.text}) for our organization.

Based EXCLUSIVELY on our organization's policies, documentation, business context, and operations, determine:

1. Is this control applicable to our organization? Consider:
   - Our business type and industry
   - Our operational scope and scale
   - Our risk profile
   - Our regulatory requirements
   - Our technical infrastructure
   - Our existing policies and governance structure

2. Provide a justification:
   - If applicable: Explain how this control is currently implemented in our organization, including our policies, procedures, or technical measures that address this control.
   - If not applicable: Explain why this control does not apply to our business context, our operational characteristics that make it irrelevant, and our risk profile considerations.

Respond in the following JSON format:
{
  "isApplicable": "YES" or "NO",
  "justification": "Your justification text here (2-3 sentences)"
}

If you cannot find sufficient information in the provided context to answer either question, respond with:
{
  "isApplicable": "INSUFFICIENT_DATA",
  "justification": null
}

IMPORTANT: Base your answer ONLY on information found in our organization's documentation. Do NOT use general knowledge or make assumptions.`;

  const soaResult = await generateSOAAnswerWithRAG(
    soaQuestion,
    organizationId,
  );

  // If no answer or insufficient data, default to YES (no justification needed)
  if (!soaResult.answer) {
    send({
      type: 'answer',
      questionId: question.id,
      questionIndex: index,
      isApplicable: true,
      justification: null,
      success: true,
      insufficientData: false,
    });

    return {
      questionId: question.id,
      isApplicable: true,
      justification: null,
      success: true,
      insufficientData: false,
    };
  }

  return parseAndProcessAnswer(question.id, index, soaResult.answer, send);
}

function parseAndProcessAnswer(
  questionId: string,
  index: number,
  answerText: string,
  send: SendFunction,
): ProcessResult {
  // Parse JSON response
  let parsedAnswer: { isApplicable?: string; justification?: string | null } | null = null;
  try {
    parsedAnswer = JSON.parse(answerText);
  } catch {
    const trimmedAnswer = answerText.trim();
    
    // Check for insufficient data indicators - if insufficient, default to YES
    if (
      trimmedAnswer.toUpperCase().includes('INSUFFICIENT_DATA') ||
      trimmedAnswer.toUpperCase().includes('N/A') ||
      trimmedAnswer.toUpperCase().includes('NO EVIDENCE FOUND') ||
      trimmedAnswer.toUpperCase().includes('NOT ENOUGH INFORMATION')
    ) {
      send({
        type: 'answer',
        questionId,
        questionIndex: index,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      });

      return {
        questionId,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      };
    }

    // Try to extract YES/NO and justification from text
    const isApplicableMatch = trimmedAnswer.match(/(?:isApplicable|applicable)[:\s]*["']?(YES|NO|INSUFFICIENT_DATA)["']?/i);
    const justificationMatch = trimmedAnswer.match(/(?:justification)[:\s]*["']?([^"']{20,})["']?/i);
    
    parsedAnswer = {
      isApplicable: isApplicableMatch ? isApplicableMatch[1].toUpperCase() : undefined,
      justification: justificationMatch ? justificationMatch[1].trim() : null,
    };
  }

  // Check for insufficient data - if insufficient, default to YES
  if (
    !parsedAnswer ||
    !parsedAnswer.isApplicable ||
    parsedAnswer.isApplicable === 'INSUFFICIENT_DATA' ||
    parsedAnswer.isApplicable.toUpperCase().includes('INSUFFICIENT')
  ) {
    send({
      type: 'answer',
      questionId,
      questionIndex: index,
      isApplicable: true,
      justification: null,
      success: true,
      insufficientData: false,
    });

    return {
      questionId,
      isApplicable: true,
      justification: null,
      success: true,
      insufficientData: false,
    };
  }

  // Parse isApplicable
  const isApplicableText = parsedAnswer.isApplicable.toUpperCase();
  const isApplicable = isApplicableText.includes('YES') || isApplicableText.includes('APPLICABLE');
  const isNotApplicable = isApplicableText.includes('NO') || isApplicableText.includes('NOT APPLICABLE');

  let finalIsApplicable: boolean | null = null;
  if (isApplicable && !isNotApplicable) {
    finalIsApplicable = true;
  } else if (isNotApplicable && !isApplicable) {
    finalIsApplicable = false;
  } else {
    // Can't determine YES/NO - default to YES
    send({
      type: 'answer',
      questionId,
      questionIndex: index,
      isApplicable: true,
      justification: null,
      success: true,
      insufficientData: false,
    });

    return {
      questionId,
      isApplicable: true,
      justification: null,
      success: true,
      insufficientData: false,
    };
  }

  // Get justification (only if NO)
  const justification = finalIsApplicable === false
    ? (parsedAnswer.justification || null)
    : null;

  send({
    type: 'answer',
    questionId,
    questionIndex: index,
    isApplicable: finalIsApplicable,
    justification,
    success: true,
    insufficientData: false,
  });

  return {
    questionId,
    isApplicable: finalIsApplicable,
    justification,
    success: true,
    insufficientData: false,
  };
}

