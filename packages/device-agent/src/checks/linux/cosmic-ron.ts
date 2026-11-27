/**
 * Parsers for the two COSMIC settings the screen lock check reads. cosmic-config stores each key
 * as one RON value in its own file and reads it with `ron::from_str`, so these accept exactly what
 * that call accepts for the Rust types involved and reject everything else.
 */

/**
 * Parses `screen_off_time` (`Option<u32>`): `None` or `Some(<decimal>)`. Returns undefined for
 * anything else, including a bare number, which `ron` rejects for an `Option` unless the
 * `implicit_some` extension is enabled (cosmic-config does not enable it).
 */
export function parseScreenOffTime(text: string): number | null | undefined {
  const reader = new RonReader(text);
  if (reader.eatWord('None')) {
    return reader.atEnd() ? null : undefined;
  }
  if (!reader.eatWord('Some') || !reader.eat('(')) return undefined;
  const digits = reader.readDigits();
  if (digits === null || !reader.eat(')') || !reader.atEnd()) return undefined;
  const ms = Number(digits);
  return Number.isSafeInteger(ms) && ms <= 0xffffffff ? ms : undefined;
}

/**
 * Parses `system_actions` into action name -> command. Mirrors `SystemActionsImpl`: every value
 * must be a string or the whole map is rejected, and entries are otherwise kept by key name.
 * Returns undefined when the text is not such a map.
 */
export function parseSystemActions(text: string): Map<string, string> | undefined {
  const reader = new RonReader(text);
  const actions = new Map<string, string>();
  if (!reader.eat('{')) return undefined;
  while (!reader.eat('}')) {
    const key = reader.readIdentifier();
    if (key === null || !reader.eat(':')) return undefined;
    const command = reader.readString();
    if (command === null) return undefined;
    actions.set(key, command);
    if (!reader.eat(',')) {
      if (!reader.eat('}')) return undefined;
      break;
    }
  }
  return reader.atEnd() ? actions : undefined;
}

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "'": "'",
  '\\': '\\',
  '/': '/',
  n: '\n',
  r: '\r',
  t: '\t',
  b: '\b',
  f: '\f',
  '0': '\0',
};

const UNICODE_ESCAPE = /^u\{([0-9a-fA-F]{1,6})\}|^u([0-9a-fA-F]{4})|^x([0-9a-fA-F]{2})/;

/**
 * Reader for the RON subset cosmic-config writes: identifiers, punctuation, decimal digits and
 * strings (escaped or raw), skipping whitespace and line/block comments between tokens.
 */
class RonReader {
  private pos = 0;
  private readonly text: string;

  constructor(text: string) {
    this.text = text;
  }

  atEnd(): boolean {
    this.skipTrivia();
    return this.pos === this.text.length;
  }

  eat(char: string): boolean {
    this.skipTrivia();
    if (this.text[this.pos] !== char) return false;
    this.pos++;
    return true;
  }

  eatWord(word: string): boolean {
    const start = this.pos;
    if (this.readIdentifier() === word) return true;
    this.pos = start;
    return false;
  }

  readIdentifier(): string | null {
    const match = this.match(/^(?:r#)?[A-Za-z_][A-Za-z0-9_]*/);
    return match === null ? null : match.replace(/^r#/, '');
  }

  readDigits(): string | null {
    return this.match(/^\d+/);
  }

  readString(): string | null {
    this.skipTrivia();
    const raw = /^r(#*)"/.exec(this.text.slice(this.pos));
    if (raw) return this.readRawString({ hashes: raw[1], openLength: raw[0].length });
    if (this.text[this.pos] !== '"') return null;
    return this.readEscapedString();
  }

  private readRawString({ hashes, openLength }: { hashes: string; openLength: number }) {
    const close = `"${hashes}`;
    const start = this.pos + openLength;
    const end = this.text.indexOf(close, start);
    if (end === -1) return null;
    this.pos = end + close.length;
    return this.text.slice(start, end);
  }

  private readEscapedString(): string | null {
    let out = '';
    let i = this.pos + 1;
    while (i < this.text.length) {
      const ch = this.text[i];
      if (ch === '"') {
        this.pos = i + 1;
        return out;
      }
      if (ch !== '\\') {
        out += ch;
        i++;
        continue;
      }
      const esc = this.text[i + 1];
      if (esc !== undefined && esc in SIMPLE_ESCAPES) {
        out += SIMPLE_ESCAPES[esc];
        i += 2;
        continue;
      }
      const unicode = UNICODE_ESCAPE.exec(this.text.slice(i + 1));
      if (!unicode) return null;
      const code = parseInt(unicode[1] ?? unicode[2] ?? unicode[3], 16);
      if (code > 0x10ffff) return null;
      out += String.fromCodePoint(code);
      i += 1 + unicode[0].length;
    }
    return null;
  }

  private match(pattern: RegExp): string | null {
    this.skipTrivia();
    const match = pattern.exec(this.text.slice(this.pos));
    if (!match) return null;
    this.pos += match[0].length;
    return match[0];
  }

  private skipTrivia(): void {
    for (;;) {
      const rest = this.text.slice(this.pos);
      const whitespace = /^\s+/.exec(rest);
      if (whitespace) {
        this.pos += whitespace[0].length;
      } else if (rest.startsWith('//')) {
        const newline = this.text.indexOf('\n', this.pos);
        this.pos = newline === -1 ? this.text.length : newline + 1;
      } else if (rest.startsWith('/*')) {
        const close = this.text.indexOf('*/', this.pos + 2);
        this.pos = close === -1 ? this.text.length : close + 2;
      } else {
        return;
      }
    }
  }
}
