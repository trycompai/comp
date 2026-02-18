import { app } from 'electron';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

let logFilePath: string | null = null;

function getLogDir(): string {
  if (process.platform === 'darwin') {
    return path.join(app.getPath('home'), 'Library', 'Logs', 'CompAI-Device-Agent');
  }
  // Windows: %APPDATA%/CompAI-Device-Agent/logs
  return path.join(app.getPath('userData'), 'logs');
}

function ensureLogFile(): string {
  if (logFilePath) return logFilePath;

  const logDir = getLogDir();
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  logFilePath = path.join(logDir, `device-agent-${date}.log`);
  return logFilePath;
}

/**
 * Logs a message to both console and a log file.
 * Log file location:
 *   macOS: ~/Library/Logs/CompAI-Device-Agent/
 *   Windows: %APPDATA%/CompAI-Device-Agent/logs/
 */
export function log(message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO'): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}\n`;

  // Always log to console
  if (level === 'ERROR') {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }

  // Also write to file
  try {
    const filePath = ensureLogFile();
    appendFileSync(filePath, line);
  } catch {
    // If file logging fails, console is still there
  }
}

/**
 * Returns the path to the current log file (useful for debugging info in UI).
 */
export function getLogFilePath(): string {
  return ensureLogFile();
}
