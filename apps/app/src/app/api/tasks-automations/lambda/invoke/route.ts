import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { NextResponse } from 'next/server';

const DEFAULTS = {
  functionName: 'automated-tasks',
  region: 'us-east-1',
  orgId: 'org_689ce3dced87cc45f600a04b',
  taskId: 'tsk_689ce3dd6f19f4cf1f0ea061',
};

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orgId?: string;
      taskId?: string;
      region?: string;
      functionName?: string;
    };
    const orgId = body.orgId || DEFAULTS.orgId;
    const taskId = body.taskId || DEFAULTS.taskId;
    const region = body.region || DEFAULTS.region;
    const functionName = body.functionName || DEFAULTS.functionName;

    const credentials =
      process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY as string,
          }
        : undefined;

    const lambda = new LambdaClient({
      region: region || process.env.APP_AWS_REGION || 'us-east-1',
      credentials,
    });
    const resp = await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(JSON.stringify({ orgId, taskId })),
      }),
    );

    const payloadStr = resp.Payload ? new TextDecoder().decode(resp.Payload) : '';

    return NextResponse.json({
      functionName,
      region,
      orgId,
      taskId,
      statusCode: resp.StatusCode,
      executedVersion: resp.ExecutedVersion,
      payload: payloadStr,
    });
  } catch (error) {
    console.error('Error invoking Lambda', error);
    return NextResponse.json({ error: 'Failed to invoke Lambda' }, { status: 500 });
  }
}
