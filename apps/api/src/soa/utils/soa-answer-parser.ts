import {
  isInsufficientDataAnswer,
  FULLY_REMOTE_JUSTIFICATION,
} from './constants';

export interface SOAQuestionResult {
  questionId: string;
  isApplicable: boolean | null;
  justification: string | null;
  success: boolean;
  insufficientData?: boolean;
  error?: string;
}

export interface SOAQuestion {
  id: string;
  text: string;
  columnMapping: {
    closure: string;
    title: string;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification: string | null;
  };
}

export type SOAStreamSender = (data: {
  type: string;
  questionId?: string;
  questionIndex?: number;
  isApplicable?: boolean | null;
  justification?: string | null;
  success?: boolean;
  insufficientData?: boolean;
}) => void;

/**
 * Creates a default YES result (used when insufficient data)
 */
export function createDefaultYesResult(
  questionId: string,
  index: number,
  send: SOAStreamSender,
): SOAQuestionResult {
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

/**
 * Creates a fully remote NO result (used for control 7.x when org is fully remote)
 */
export function createFullyRemoteResult(
  questionId: string,
  index: number,
  send: SOAStreamSender,
): SOAQuestionResult {
  send({
    type: 'answer',
    questionId,
    questionIndex: index,
    isApplicable: false,
    justification: FULLY_REMOTE_JUSTIFICATION,
    success: true,
    insufficientData: false,
  });

  return {
    questionId,
    isApplicable: false,
    justification: FULLY_REMOTE_JUSTIFICATION,
    success: true,
    insufficientData: false,
  };
}

/**
 * Checks if a control is for physical security (section 7)
 */
export function isPhysicalSecurityControl(closure: string): boolean {
  return closure.startsWith('7.');
}

/**
 * Parses and processes a SOA answer response from LLM
 * Returns structured result with isApplicable and justification
 */
export function parseAndProcessSOAAnswer(
  questionId: string,
  index: number,
  answerText: string,
  send: SOAStreamSender,
): SOAQuestionResult {
  // Parse JSON response
  let parsedAnswer: {
    isApplicable?: string;
    justification?: string | null;
  } | null = null;

  try {
    parsedAnswer = JSON.parse(answerText);
  } catch {
    // If JSON parsing fails, try to extract from text
    const trimmedAnswer = answerText.trim();

    // Check for insufficient data indicators - if insufficient, default to YES
    if (isInsufficientDataAnswer(trimmedAnswer)) {
      return createDefaultYesResult(questionId, index, send);
    }

    // Try to extract YES/NO and justification from text
    const isApplicableMatch = trimmedAnswer.match(
      /(?:isApplicable|applicable)[:\s]*["']?(YES|NO|INSUFFICIENT_DATA)["']?/i,
    );
    const justificationMatch = trimmedAnswer.match(
      /(?:justification)[:\s]*["']?([^"']{20,})["']?/i,
    );

    parsedAnswer = {
      isApplicable: isApplicableMatch
        ? isApplicableMatch[1].toUpperCase()
        : undefined,
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
    return createDefaultYesResult(questionId, index, send);
  }

  // Parse isApplicable
  const isApplicableText = parsedAnswer.isApplicable.toUpperCase();
  const isApplicable =
    isApplicableText.includes('YES') || isApplicableText.includes('APPLICABLE');
  const isNotApplicable =
    isApplicableText.includes('NO') ||
    isApplicableText.includes('NOT APPLICABLE');

  let finalIsApplicable: boolean | null = null;
  if (isApplicable && !isNotApplicable) {
    finalIsApplicable = true;
  } else if (isNotApplicable && !isApplicable) {
    finalIsApplicable = false;
  } else {
    // Can't determine YES/NO - default to YES
    return createDefaultYesResult(questionId, index, send);
  }

  // Get justification (only if NO)
  const justification =
    finalIsApplicable === false ? parsedAnswer.justification || null : null;

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
