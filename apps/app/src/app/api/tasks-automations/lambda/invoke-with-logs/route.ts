import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Sandbox } from '@vercel/sandbox';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { orgId, taskId, sandboxId } = await req.json();

    if (!orgId || !taskId || !sandboxId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get AWS credentials
    const credentials =
      process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
            ...(process.env.APP_AWS_SESSION_TOKEN && {
              sessionToken: process.env.APP_AWS_SESSION_TOKEN,
            }),
          }
        : undefined;

    // Invoke the Lambda
    const lambda = new LambdaClient({
      region: process.env.APP_AWS_REGION || 'us-east-1',
      credentials,
    });
    const invokeCommand = new InvokeCommand({
      FunctionName: 'automated-tasks',
      Payload: JSON.stringify({ orgId, taskId }),
    });

    const invokeResult = await lambda.send(invokeCommand);
    const payloadText = new TextDecoder().decode(invokeResult.Payload);
    let result;

    try {
      result = JSON.parse(payloadText);
    } catch {
      result = { raw: payloadText };
    }

    // Get the sandbox and create a command to show the output
    const sandbox = await Sandbox.get({ sandboxId });

    // Create a simple script that just outputs the result
    const outputScript = `
console.log('AWS Lambda Invocation Result:');
console.log('Function: automated-tasks');
console.log('Payload: ${JSON.stringify({ orgId, taskId })}');
console.log('\\n--- Output ---');
console.log(${JSON.stringify(JSON.stringify(result, null, 2))});
`;

    // Write the script
    await sandbox.writeFiles([
      { path: 'lambda-output.js', content: Buffer.from(outputScript, 'utf8') },
    ]);

    // Run it to generate logs
    const cmd = await sandbox.runCommand({
      detached: true,
      cmd: 'node',
      args: ['lambda-output.js'],
    });

    return NextResponse.json({
      ok: true,
      cmdId: cmd.cmdId,
      command: 'node',
      args: ['lambda-output.js'],
      sandboxId,
      result,
      statusCode: invokeResult.StatusCode,
      functionError: invokeResult.FunctionError,
    });
  } catch (error) {
    console.error('Error invoking Lambda:', error);
    return NextResponse.json(
      { error: 'Failed to invoke Lambda', details: (error as Error)?.message },
      { status: 500 },
    );
  }
}
