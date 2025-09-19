import { Sandbox } from '@vercel/sandbox';
import { NextResponse, type NextRequest } from 'next/server';
import z from 'zod/v3';

const FileParamsSchema = z.object({
  sandboxId: z.string(),
  path: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> },
) {
  const { sandboxId } = await params;
  const fileParams = FileParamsSchema.safeParse({
    path: request.nextUrl.searchParams.get('path'),
    sandboxId,
  });

  if (fileParams.success === false) {
    return NextResponse.json(
      { error: 'Invalid parameters. You must pass a `path` as query' },
      { status: 400 },
    );
  }

  const sandbox = await Sandbox.get(fileParams.data);
  const stream = await sandbox.readFile(fileParams.data);
  if (!stream) {
    return NextResponse.json({ error: 'File not found in the Sandbox' }, { status: 404 });
  }

  return new NextResponse(
    new ReadableStream({
      async pull(controller) {
        for await (const chunk of stream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> },
) {
  const { sandboxId } = await params;
  const body = await request.json();
  const schema = z.object({ path: z.string(), content: z.string() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.writeFiles([
    { path: parsed.data.path, content: Buffer.from(parsed.data.content, 'utf8') },
  ]);
  return NextResponse.json({ ok: true, path: parsed.data.path });
}
