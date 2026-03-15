export function die(message: string): never {
  console.error(`\x1b[31merror:\x1b[0m ${message}`);
  process.exit(1);
}

export function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function extractFlag(
  args: string[],
  flag: string,
): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}
