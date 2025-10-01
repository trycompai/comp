import { Sandbox } from '@vercel/sandbox';
import { NextResponse } from 'next/server';

export async function POST() {
  const sandbox = await Sandbox.create({ timeout: 600000 });
  return NextResponse.json({ sandboxId: sandbox.sandboxId });
}
