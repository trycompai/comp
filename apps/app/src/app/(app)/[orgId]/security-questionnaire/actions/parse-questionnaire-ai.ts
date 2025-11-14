'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, extractS3KeyFromUrl, s3Client } from '@/app/s3';
import { env } from '@/env.mjs';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { generateObject, generateText, jsonSchema } from 'ai';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { findSimilarContent, upsertEmbedding, chunkText, extractTextFromPolicy } from '@/lib/vector';

const inputSchema = z.object({
  inputType: z.enum(['file', 'url', 'attachment']),
  // For file uploads
  fileData: z.string().optional(), // base64 encoded
  fileName: z.string().optional(),
  fileType: z.string().optional(), // MIME type
  // For URLs
  url: z.string().url().optional(),
  // For attachments
  attachmentId: z.string().optional(),
});

interface QuestionAnswer {
  question: string;
  answer: string | null;
}

/**
 * Extracts content from a file using various methods based on file type
 */
async function extractContentFromFile(
  fileData: string,
  fileType: string,
): Promise<string> {
  const fileBuffer = Buffer.from(fileData, 'base64');
  
  // Handle Excel files (.xlsx, .xls)
  if (
    fileType === 'application/vnd.ms-excel' ||
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel.sheet.macroEnabled.12'
  ) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheets: string[] = [];
      
      // Extract content from all sheets
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Convert to readable text format
        const sheetText = jsonData
          .map((row: any) => {
            if (Array.isArray(row)) {
              return row.filter((cell) => cell !== null && cell !== undefined && cell !== '').join(' | ');
            }
            return String(row);
          })
          .filter((line: string) => line.trim() !== '')
          .join('\n');
        
        if (sheetText.trim()) {
          sheets.push(`Sheet: ${sheetName}\n${sheetText}`);
        }
      });
      
      return sheets.join('\n\n');
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Handle CSV files
  if (fileType === 'text/csv' || fileType === 'text/comma-separated-values') {
    try {
      const text = fileBuffer.toString('utf-8');
      // Convert CSV to readable format
      const lines = text.split('\n').filter((line) => line.trim() !== '');
      return lines.join('\n');
    } catch (error) {
      throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Handle plain text files
  if (fileType === 'text/plain' || fileType.startsWith('text/')) {
    try {
      return fileBuffer.toString('utf-8');
    } catch (error) {
      throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Handle Word documents - try to use OpenAI vision API
  if (
    fileType === 'application/msword' ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    // For Word docs, we'll try to use OpenAI vision API if possible
    // Note: OpenAI vision API doesn't directly support .docx, so we'll need to convert or use a library
    // For now, let's try to extract text using a fallback approach
    try {
      // Try to extract text using OpenAI vision by converting to image representation
      // Or we could use a library like mammoth, but for now let's use vision API as fallback
      throw new Error(
        'Word documents (.docx) are best converted to PDF or image format for parsing. Alternatively, use a URL to view the document.',
      );
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to process Word document');
    }
  }
  
  // For images and PDFs, use OpenAI vision API
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  
  if (isImage || isPdf) {
    const base64Data = fileData;
    const mimeType = fileType;
    
    try {
      const { text } = await generateText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all text content from this document and identify question–answer pairs.
	•	If the document includes columns or sections labeled "Question", "Questions", "Q", "Prompt", treat those as questions.
	•	If it includes "Answer", "Answers", "A", "Response", treat those as answers.
	•	If explicit headers are missing, infer which text segments are questions based on phrasing (e.g., sentences ending with "?", or starting with words like What, How, Why, When, Is, Can, Do, etc.), and match them to their most likely corresponding answers nearby.
	•	Preserve the original order and structure.
	•	Format the result as a clean list or structured text of Question → Answer pairs.
	•	Exclude any irrelevant or unrelated text.
	•	Return only the extracted question–answer pairs, without extra commentary.`,
              },
              {
                type: 'image',
                image: `data:${mimeType};base64,${base64Data}`,
              },
            ],
          },
        ],
      });
      
      return text;
    } catch (error) {
      throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // For other file types that might be binary formats, provide helpful error message
  throw new Error(
    `Unsupported file type: ${fileType}. Supported formats: PDF, images (PNG, JPG, etc.), Excel (.xlsx, .xls), CSV, text files (.txt), and Word documents (.docx - convert to PDF for best results).`,
  );
}

/**
 * Converts Google Sheets URL to export format URLs
 */
function convertGoogleSheetsUrlToExport(url: string): { csvUrl: string; xlsxUrl: string } | null {
  // Match Google Sheets URL pattern: https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const sheetId = match[1];
    // Try to extract gid from URL if present
    const gidMatch = url.match(/[#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    
    return {
      csvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
      xlsxUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&gid=${gid}`,
    };
  }
  return null;
}

/**
 * Extracts content from a URL using Firecrawl
 */
async function extractContentFromUrl(url: string): Promise<string> {
  // Check if it's a Google Sheets URL
  const isGoogleSheets = url.includes('docs.google.com/spreadsheets');
  
  // For Google Sheets, use Firecrawl as direct export often fails due to authentication/permissions
  // Firecrawl can handle Google Sheets better
  if (isGoogleSheets) {
    // Note: User should ensure the document is publicly viewable for best results
  }
  
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error('Firecrawl API key is not configured');
  }
  
  try {
    const initialResponse = await fetch('https://api.firecrawl.dev/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        urls: [url],
        prompt: 'Extract all text content from this page, including any questions and answers, forms, or questionnaire data.',
        scrapeOptions: {
          onlyMainContent: true,
          removeBase64Images: true,
        },
      }),
    });
    
    const initialData = await initialResponse.json();
    
    if (!initialData.success || !initialData.id) {
      throw new Error('Failed to start Firecrawl extraction');
    }
    
    const jobId = initialData.id;
    const maxWaitTime = 1000 * 60 * 5; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      
      const statusResponse = await fetch(`https://api.firecrawl.dev/v1/extract/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        },
      });
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed' && statusData.data) {
        // Extract text from the response
        const extractedData = statusData.data;
        if (typeof extractedData === 'string') {
          return extractedData;
        }
        if (typeof extractedData === 'object' && extractedData.content) {
          return typeof extractedData.content === 'string'
            ? extractedData.content
            : JSON.stringify(extractedData.content);
        }
        return JSON.stringify(extractedData);
      }
      
      if (statusData.status === 'failed') {
        throw new Error('Firecrawl extraction failed');
      }
      
      if (statusData.status === 'cancelled') {
        throw new Error('Firecrawl extraction was cancelled');
      }
    }
    
    throw new Error('Firecrawl extraction timed out');
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to extract content from URL');
  }
}

/**
 * Extracts content from an attachment stored in S3
 */
async function extractContentFromAttachment(
  attachmentId: string,
  organizationId: string,
): Promise<{ content: string; fileType: string }> {
  const attachment = await db.attachment.findUnique({
    where: {
      id: attachmentId,
      organizationId,
    },
  });
  
  if (!attachment) {
    throw new Error('Attachment not found');
  }
  
  const key = extractS3KeyFromUrl(attachment.url);
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME!,
    Key: key,
  });
  
  const response = await s3Client.send(getCommand);
  
  if (!response.Body) {
    throw new Error('Failed to retrieve attachment from S3');
  }
  
  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64Data = buffer.toString('base64');
  
  // Determine file type from attachment or content type
  const fileType =
    response.ContentType ||
    (attachment.type === 'image' ? 'image/png' : 'application/pdf');
  
  const content = await extractContentFromFile(base64Data, fileType);
  
  return { content, fileType };
}

/**
 * Parses questions and answers from extracted content using LLM
 */
async function parseQuestionsAndAnswers(content: string): Promise<QuestionAnswer[]> {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    mode: 'json',
    schema: jsonSchema({
      type: 'object',
      properties: {
        questionsAndAnswers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The question text',
              },
              answer: {
                anyOf: [
                  { type: 'string' },
                  { type: 'null' },
                ],
                description: 'The answer to the question. Use null if no answer is provided.',
              },
            },
            required: ['question'],
          },
        },
      },
      required: ['questionsAndAnswers'],
    }),
    system: `You are an expert at extracting structured question-answer pairs from vendor questionnaires and security assessment documents.
    
Your task is to:
1. Identify all questions in the document
2. Match each question with its corresponding answer
3. Extract the question-answer pairs in a structured format
4. If a question doesn't have a clear answer or the answer is empty, use null (not an empty string or placeholder text)
5. Preserve the exact wording of questions and answers when possible
6. Handle various formats: forms, tables, lists, paragraphs, etc.

Return all question-answer pairs you find in the document. Use null for missing or empty answers.`,
    prompt: `Extract all question-answer pairs from the following content:

${content}

Return a structured list of questions and their corresponding answers.`,
  });
  
  const parsed = (object as { questionsAndAnswers: QuestionAnswer[] }).questionsAndAnswers;
  
  // Post-process to ensure empty strings are converted to null
  return parsed.map((qa) => ({
    question: qa.question,
    answer: qa.answer && qa.answer.trim() !== '' ? qa.answer : null,
  }));
}

export const parseQuestionnaireAI = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'parse-questionnaire-ai',
    track: {
      event: 'parse-questionnaire-ai',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { inputType } = parsedInput;
    const { session } = ctx;
    
    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }
    
    const organizationId = session.activeOrganizationId;
    
    try {
      // Ensure embeddings exist for this organization before parsing
      // Check if policy embeddings exist specifically, and create them if needed
      try {
        // Check specifically for policy embeddings by searching and filtering by sourceType
        const testResults = await findSimilarContent('policy security compliance', organizationId, 10);
        const hasPolicyEmbeddings = testResults.some((result) => result.sourceType === 'policy');
        
        // Always ensure policies are synced (they might be missing even if context exists)
        if (!hasPolicyEmbeddings) {
          // Create embeddings for policies (limit to 10 to avoid timeout)
          const policies = await db.policy.findMany({
            where: {
              organizationId,
              status: 'published',
            },
            select: {
              id: true,
              name: true,
              description: true,
              content: true,
              organizationId: true,
            },
            take: 10,
          });

          if (policies.length > 0) {
            for (const policy of policies) {
              try {
                const policyText = extractTextFromPolicy(policy as any);
                if (!policyText || policyText.trim().length === 0) {
                  continue;
                }

                const chunks = chunkText(policyText, 500, 50);
                if (chunks.length === 0) {
                  continue;
                }

                for (let i = 0; i < chunks.length; i++) {
                  const chunk = chunks[i];
                  if (!chunk || chunk.trim().length === 0) {
                    continue;
                  }
                  const embeddingId = `policy_${policy.id}_chunk${i}`;
                  await upsertEmbedding(embeddingId, chunk, {
                    organizationId: policy.organizationId,
                    sourceType: 'policy',
                    sourceId: policy.id,
                    content: chunk,
                    policyName: policy.name,
                  });
                }
              } catch (error) {
                // Continue on error
              }
            }
          }
        }

        // Check for context embeddings separately
        const contextTestResults = await findSimilarContent('context question answer', organizationId, 1);
        const hasContextEmbeddings = contextTestResults.some((result) => result.sourceType === 'context');
        
        if (!hasContextEmbeddings) {
          // Create embeddings for context entries (limit to 10 to avoid timeout)
          const contextEntries = await db.context.findMany({
            where: { organizationId },
            select: {
              id: true,
              question: true,
              answer: true,
              organizationId: true,
            },
            take: 10,
          });

          if (contextEntries.length > 0) {
            for (const context of contextEntries) {
              try {
                const contextText = `Question: ${context.question}\n\nAnswer: ${context.answer}`;
                if (!contextText || contextText.trim().length === 0) {
                  continue;
                }

                const chunks = chunkText(contextText, 500, 50);
                for (let i = 0; i < chunks.length; i++) {
                  const chunk = chunks[i];
                  const embeddingId = `context_${context.id}_chunk${i}`;
                  await upsertEmbedding(embeddingId, chunk, {
                    organizationId: context.organizationId,
                    sourceType: 'context',
                    sourceId: context.id,
                    content: chunk,
                    contextQuestion: context.question,
                  });
                }
              } catch (error) {
                // Continue on error
              }
            }
          }
        }
      } catch (error) {
        // Don't fail parsing if embeddings check/creation fails
      }
      
      let extractedContent: string;
      
      // Extract content based on input type
      switch (inputType) {
        case 'file': {
          if (!parsedInput.fileData || !parsedInput.fileType) {
            throw new Error('File data and file type are required for file input');
          }
          extractedContent = await extractContentFromFile(
            parsedInput.fileData,
            parsedInput.fileType,
          );
          break;
        }
        
        case 'url': {
          if (!parsedInput.url) {
            throw new Error('URL is required for URL input');
          }
          extractedContent = await extractContentFromUrl(parsedInput.url);
          break;
        }
        
        case 'attachment': {
          if (!parsedInput.attachmentId) {
            throw new Error('Attachment ID is required for attachment input');
          }
          const result = await extractContentFromAttachment(
            parsedInput.attachmentId,
            organizationId,
          );
          extractedContent = result.content;
          break;
        }
        
        default:
          throw new Error(`Unsupported input type: ${inputType}`);
      }
      
      // Parse questions and answers from extracted content
      const questionsAndAnswers = await parseQuestionsAndAnswers(extractedContent);
      
      const vendorName = 'Security Questionnaire';
      const sourcePrefix = `org_${organizationId}`;
      
      // Add parsed questionnaire Q&A pairs to vector database
      try {
        for (let i = 0; i < questionsAndAnswers.length; i++) {
          const qa = questionsAndAnswers[i];
          
          // Skip if no answer (we can't use empty answers as context)
          if (!qa.answer || qa.answer.trim().length === 0) {
            continue;
          }
          
          try {
            // Create text representation: "Question: X\n\nAnswer: Y"
            const qaText = `Question: ${qa.question}\n\nAnswer: ${qa.answer}`;
            
            // Chunk if needed (though Q&A pairs are usually short)
            const chunks = chunkText(qaText, 500, 50);
            
            for (let j = 0; j < chunks.length; j++) {
              const chunk = chunks[j];
              const embeddingId = `questionnaire_${sourcePrefix}_qa${i}_chunk${j}`;
              
              await upsertEmbedding(embeddingId, chunk, {
                organizationId,
                sourceType: 'questionnaire',
                sourceId: `${sourcePrefix}_qa${i}`,
                content: chunk,
                vendorName,
                questionnaireQuestion: qa.question,
              });
            }
          } catch (error) {
            // Continue with other Q&A pairs even if one fails
          }
        }
      } catch (error) {
        // Don't fail parsing if vector DB addition fails
      }
      
      return {
        success: true,
        data: {
          questionsAndAnswers,
          extractedContent: extractedContent.substring(0, 1000), // Return first 1000 chars for preview
        },
      };
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to parse questionnaire');
    }
  });

