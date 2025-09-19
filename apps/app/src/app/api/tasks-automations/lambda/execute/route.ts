import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({ region: 'us-east-1' });
const lambda = new LambdaClient({ region: 'us-east-1' });

export async function POST(req: Request) {
  try {
    const { orgId, taskId, sandboxId } = await req.json();

    if (!orgId || !taskId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Check for AI model credentials from environment
    const modelName = process.env.ANTHROPIC_API_KEY ? 'claude-3-5-sonnet-latest' : 'gpt-4o';
    const modelApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

    if (!modelApiKey) {
      return NextResponse.json(
        { error: 'No AI model API key configured in environment (OpenAI or Anthropic required)' },
        { status: 500 },
      );
    }

    // Ensure the script exists in S3
    try {
      const { Body } = await s3.send(
        new GetObjectCommand({
          Bucket: 'comp-testing-lambda-tasks',
          Key: `${orgId}/${taskId}.js`,
        }),
      );
      await Body!.transformToString();
    } catch (error) {
      console.error('Failed to fetch Lambda script from S3:', error);
      return NextResponse.json({ error: 'Lambda script not found in S3' }, { status: 404 });
    }

    // Invoke the automated-tasks Lambda
    const functionName = process.env.AUTOMATED_TASKS_LAMBDA_NAME || 'automated-tasks';

    const payload = {
      orgId,
      taskId,
      runType: 'lambda',
      modelName,
      modelApiKey,
    };

    console.log('Invoking Lambda function:', functionName, 'with payload:', payload);

    const invokeResponse = await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse', // Synchronous invocation
        Payload: Buffer.from(JSON.stringify(payload)),
      }),
    );

    // Parse the Lambda response
    const responsePayload = invokeResponse.Payload
      ? JSON.parse(new TextDecoder().decode(invokeResponse.Payload))
      : null;

    if (invokeResponse.FunctionError) {
      console.error('Lambda function error:', responsePayload);
      return NextResponse.json(
        {
          error: 'Lambda execution failed',
          details: responsePayload?.errorMessage || 'Unknown error',
          errorType: responsePayload?.errorType,
        },
        { status: 500 },
      );
    }

    // Return the Lambda result
    return NextResponse.json({
      success: true,
      data: responsePayload,
      statusCode: invokeResponse.StatusCode,
      requestId: invokeResponse.$metadata?.requestId,
      modelName,
    });
  } catch (error) {
    console.error('Error executing Lambda script:', error);
    return NextResponse.json(
      { error: 'Failed to execute Lambda script', details: (error as Error)?.message },
      { status: 500 },
    );
  }
}
