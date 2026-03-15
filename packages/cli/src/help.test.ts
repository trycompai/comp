import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { showHelp } from './help';

describe('showHelp', () => {
  let output: string[];
  const originalLog = console.log;

  beforeEach(() => {
    output = [];
    console.log = (...args: unknown[]) => {
      output.push(args.map(String).join(' '));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('should show root help with all commands listed', () => {
    showHelp();
    const text = output.join('\n');

    expect(text).toContain('comp');
    expect(text).toContain('init');
    expect(text).toContain('env');
    expect(text).toContain('stats');
    expect(text).toContain('orgs');
    expect(text).toContain('users');
    expect(text).toContain('audit-logs');
    expect(text).toContain('help');
  });

  it('should show command-specific help for stats', () => {
    showHelp('stats');
    const text = output.join('\n');

    expect(text).toContain('stats');
    expect(text).toContain('organizations');
  });

  it('should show command-specific help for init', () => {
    showHelp('init');
    const text = output.join('\n');

    expect(text).toContain('init');
    expect(text).toContain('--local');
    expect(text).toContain('--staging');
    expect(text).toContain('--production');
  });

  it('should show command-specific help for users', () => {
    showHelp('users');
    const text = output.join('\n');

    expect(text).toContain('users');
    expect(text).toContain('search');
    expect(text).toContain('platform-admin');
  });

  it('should show command-specific help for audit-logs', () => {
    showHelp('audit-logs');
    const text = output.join('\n');

    expect(text).toContain('audit-logs');
    expect(text).toContain('--org-id');
    expect(text).toContain('--entity-type');
  });

  it('should fall back to root help for unknown command', () => {
    showHelp('nonexistent');
    const text = output.join('\n');

    // Should show root help since command is unknown
    expect(text).toContain('comp');
    expect(text).toContain('init');
  });
});
