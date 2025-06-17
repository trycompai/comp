import { logger } from '@/utils/logger';
import { getFleetAgent } from '@/utils/s3';
import archiver from 'archiver';
import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { PassThrough } from 'node:stream';
import { promisify } from 'node:util';
import { getPackageFilename, getReadmeContent, getScriptFilename } from './scripts';
import type { CreateArchiveParams } from './types';

const execAsync = promisify(exec);

export async function createAgentArchive({
  os,
  script,
  tempDir,
}: CreateArchiveParams): Promise<PassThrough> {
  const stream = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(stream);

  try {
    // Save the script
    const scriptFilename = getScriptFilename(os);
    const scriptPath = path.join(tempDir, scriptFilename);
    await fs.writeFile(scriptPath, script, { mode: 0o755 });

    // Codesign only for macOS
    if (os === 'macos') {
      await codesignMacScript(scriptPath);
    }

    // Read the script and add to archive
    const scriptContent = await fs.readFile(scriptPath);
    archive.append(scriptContent, { name: scriptFilename, mode: 0o755 });

    // Get and add the agent package
    const agentPackage = await getFleetAgent({ os });
    const packageFilename = getPackageFilename(os);

    archive.append(agentPackage as Readable, {
      name: packageFilename,
      store: true,
    });

    // Add README with installation instructions
    const readmeContent = getReadmeContent(os);
    archive.append(Buffer.from(readmeContent), { name: 'README.txt' });

    archive.finalize().catch((err) => {
      logger('Error finalizing archive', { error: err });
      stream.destroy();
    });

    return stream;
  } catch (error) {
    logger('Error creating archive', { error });
    stream.destroy();
    throw error;
  }
}

async function codesignMacScript(scriptPath: string): Promise<void> {
  const codesignIdentity = process.env.CODESIGN_IDENTITY || 'Developer ID Application';
  try {
    await execAsync(`codesign --sign "${codesignIdentity}" --timestamp "${scriptPath}"`);
    logger('Successfully codesigned command file', { scriptPath });
  } catch (error) {
    logger('Failed to codesign command file', { error, scriptPath });
    // Continue without codesigning if it fails (e.g., in development)
  }
}
