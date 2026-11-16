import { describe, expect, it } from 'vitest';
import { parseScreenOffTime, parseSystemActions } from './cosmic-ron';

// Abridged from the file cosmic-settings-daemon installs.
const SHIPPED_SYSTEM_ACTIONS = `{
    /// Opens the application library
    AppLibrary: "cosmic-app-library",
    /// Locks the screen
    LockScreen: "loginctl lock-session",
    /// Suspend the system
    Suspend: "systemctl suspend",
}`;

describe('parseScreenOffTime', () => {
  it('accepts what ron accepts for Option<u32>', () => {
    expect(parseScreenOffTime('Some(900000)\n')).toBe(900000);
    expect(parseScreenOffTime(' Some ( 60000 ) ')).toBe(60000);
    expect(parseScreenOffTime('None')).toBeNull();
    expect(parseScreenOffTime('// set by cosmic-settings\nSome(1000) /* ms */')).toBe(1000);
  });

  it('rejects a bare number, which ron does not accept as Some without implicit_some', () => {
    expect(parseScreenOffTime('900000')).toBeUndefined();
  });

  it.each([
    '',
    'Some()',
    'Some(-1)',
    'Some(1.5)',
    'Some(4294967296)',
    'Some(1) x',
    'None x',
    'Somewhere(1)',
    'true',
  ])('rejects %j', (text) => {
    expect(parseScreenOffTime(text)).toBeUndefined();
  });
});

describe('parseSystemActions', () => {
  it('reads the shipped map and skips doc comments', () => {
    const actions = parseSystemActions(SHIPPED_SYSTEM_ACTIONS);
    expect(actions?.get('LockScreen')).toBe('loginctl lock-session');
    expect(actions?.size).toBe(3);
  });

  it('accepts an empty map and a missing trailing comma', () => {
    expect(parseSystemActions('{}')?.size).toBe(0);
    expect(parseSystemActions('{ LockScreen: "a", Suspend: "b" }')?.get('Suspend')).toBe('b');
  });

  it('never takes LockScreen from inside another value or a comment', () => {
    const actions = parseSystemActions(
      '{ Terminal: "foo, LockScreen: \\"evil\\"", /* LockScreen: "x", */ }',
    );
    expect(actions?.get('Terminal')).toBe('foo, LockScreen: "evil"');
    expect(actions?.has('LockScreen')).toBe(false);
  });

  it('decodes escapes and raw strings', () => {
    expect(parseSystemActions('{ LockScreen: "a\\nb\\t\\u{41}" }')?.get('LockScreen')).toBe(
      'a\nb\tA',
    );
    expect(parseSystemActions('{ LockScreen: r#"say "hi""# }')?.get('LockScreen')).toBe('say "hi"');
  });

  it('rejects the whole map when any value is not a string, as SystemActionsImpl does', () => {
    expect(parseSystemActions('{ LockScreen: "a", Suspend: 3 }')).toBeUndefined();
  });

  it.each([
    '',
    'not ron',
    '{ LockScreen "a" }',
    '{ LockScreen: "a" } extra',
    '{',
    '{ LockScreen: "a',
  ])('rejects %j', (text) => {
    expect(parseSystemActions(text)).toBeUndefined();
  });
});
