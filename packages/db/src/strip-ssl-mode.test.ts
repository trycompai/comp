import { describe, it, expect } from 'bun:test';

function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

describe('stripSslMode', () => {
  it('removes sslmode=require from the connection string', () => {
    const input =
      'postgresql://user:pass@host.rds.amazonaws.com:5432/mydb?sslmode=require';
    const result = stripSslMode(input);
    expect(result).toBe(
      'postgresql://user:pass@host.rds.amazonaws.com:5432/mydb',
    );
  });

  it('removes sslmode when it is one of multiple params', () => {
    const input =
      'postgresql://user:pass@host:5432/mydb?sslmode=require&connection_limit=50';
    const result = stripSslMode(input);
    expect(result).toBe(
      'postgresql://user:pass@host:5432/mydb?connection_limit=50',
    );
  });

  it('preserves other query params when sslmode is first', () => {
    const input =
      'postgresql://user:pass@host:5432/mydb?sslmode=require&pgbouncer=true&connection_limit=10';
    const result = stripSslMode(input);
    expect(result).toBe(
      'postgresql://user:pass@host:5432/mydb?pgbouncer=true&connection_limit=10',
    );
  });

  it('preserves other query params when sslmode is in the middle', () => {
    const input =
      'postgresql://user:pass@host:5432/mydb?pgbouncer=true&sslmode=require&connection_limit=10';
    const result = stripSslMode(input);
    expect(result).toBe(
      'postgresql://user:pass@host:5432/mydb?pgbouncer=true&connection_limit=10',
    );
  });

  it('preserves other query params when sslmode is last', () => {
    const input =
      'postgresql://user:pass@host:5432/mydb?connection_limit=10&sslmode=require';
    const result = stripSslMode(input);
    expect(result).toBe(
      'postgresql://user:pass@host:5432/mydb?connection_limit=10',
    );
  });

  it('handles different sslmode values', () => {
    const input =
      'postgresql://user:pass@host:5432/mydb?sslmode=verify-full';
    const result = stripSslMode(input);
    expect(result).toBe('postgresql://user:pass@host:5432/mydb');
  });

  it('returns url unchanged when no sslmode is present', () => {
    const input =
      'postgresql://user:pass@host:5432/mydb?connection_limit=50';
    const result = stripSslMode(input);
    expect(result).toBe(
      'postgresql://user:pass@host:5432/mydb?connection_limit=50',
    );
  });

  it('handles url with no query params', () => {
    const input = 'postgresql://user:pass@host:5432/mydb';
    const result = stripSslMode(input);
    expect(result).toBe('postgresql://user:pass@host:5432/mydb');
  });

  it('preserves password with special characters', () => {
    const input =
      'postgresql://user:p%40ss%23word@host:5432/mydb?sslmode=require&connection_limit=50';
    const result = stripSslMode(input);
    expect(result).toBe(
      'postgresql://user:p%40ss%23word@host:5432/mydb?connection_limit=50',
    );
  });
});
