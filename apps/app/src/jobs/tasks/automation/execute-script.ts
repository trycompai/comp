import { env } from '@/env.mjs';
import { getModelOptions } from '@/ai/gateway';
import { decrypt, type EncryptedData } from '@/lib/encryption';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { db } from '@db';
import { logger, queue, task } from '@trigger.dev/sdk';
import { generateObject } from 'ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { z } from 'zod';

// Queue for automation execution
const automationExecutionQueue = queue({
  name: 'automation-execution',
  concurrencyLimit: env.TRIGGER_QUEUE_CONCURRENCY ?? 10,
});

interface ExecuteScriptPayload {
  orgId: string;
  taskId: string;
  sandboxId?: string;
}

interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  logs: string[];
}

export const executeAutomationScript = task({
  id: 'execute-automation-script',
  queue: automationExecutionQueue,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: ExecuteScriptPayload): Promise<ExecutionResult> => {
    const { orgId, taskId } = payload;
    const logs: string[] = [];

    if (
      !process.env.APP_AWS_REGION ||
      !process.env.APP_AWS_ACCESS_KEY_ID ||
      !process.env.APP_AWS_SECRET_ACCESS_KEY
    ) {
      throw new Error('AWS S3 credentials or configuration missing. Check environment variables.');
    }

    try {
      logger.info(`Executing automation script for task ${taskId} in org ${orgId}`);

      // Fetch the script from S3
      const scriptKey = `${orgId}/${taskId}.automation.js`;
      logs.push(`[SYSTEM] Fetching script from S3: ${scriptKey}`);

      const s3Client = new S3Client({
        region: process.env.APP_AWS_REGION,
        credentials: {
          accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
        },
      });

      const { Body } = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.TASKS_AUTOMATION_BUCKET,
          Key: scriptKey,
        }),
      );

      if (!Body) {
        throw new Error('Script not found in S3');
      }

      const scriptContent = await Body.transformToString();
      logs.push(`[SYSTEM] Script loaded successfully (${scriptContent.length} bytes)`);

      // Fetch all available integrations for this org to provide context
      // Get all secrets for this org
      const secrets = await db.secret.findMany({
        where: {
          organizationId: orgId,
        },
        select: {
          id: true,
          name: true,
          value: true,
        },
      });

      const availableSecrets = secrets.map((s) => s.name);
      logs.push(`[SYSTEM] Available secrets: ${availableSecrets.join(', ') || 'none'}`);

      // Create the getSecret function (no integrationId parameter needed)
      const getSecret = async (
        providedOrgId: string,
        secretName: string,
      ): Promise<string | null> => {
        try {
          // Validate the org ID matches
          if (providedOrgId !== orgId) {
            logs.push(
              `[SYSTEM] Warning: getSecret called with different orgId: ${providedOrgId} (expected: ${orgId})`,
            );
            return null;
          }

          logs.push(`[SYSTEM] Fetching secret '${secretName}'`);

          // Find the secret
          const secret = secrets.find((s) => s.name === secretName);

          if (!secret) {
            logs.push(`[SYSTEM] Secret '${secretName}' not found`);
            return null;
          }

          // Decrypt the secret value
          const decryptedValue = await decrypt(JSON.parse(secret.value) as EncryptedData);
          logs.push(`[SYSTEM] Secret '${secretName}' successfully retrieved`);

          // Update last used timestamp (fire and forget)
          db.secret
            .update({
              where: { id: secret.id },
              data: { lastUsedAt: new Date() },
            })
            .catch((err) => {
              logger.warn('Failed to update secret last used timestamp', {
                error: err,
                secretId: secret.id,
              });
            });

          return decryptedValue;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logs.push(`[SYSTEM] Error retrieving secret '${secretName}': ${errorMsg}`);
          return null;
        }
      };

      // Create a custom console that captures logs
      const customConsole = {
        log: (...args: any[]) => {
          const message = args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ');
          logs.push(`[LOG] ${message}`);
          logger.info(message);
        },
        error: (...args: any[]) => {
          const message = args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ');
          logs.push(`[ERROR] ${message}`);
          logger.error(message);
        },
        warn: (...args: any[]) => {
          const message = args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ');
          logs.push(`[WARN] ${message}`);
          logger.warn(message);
        },
        info: (...args: any[]) => {
          const message = args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ');
          logs.push(`[INFO] ${message}`);
          logger.info(message);
        },
      };

      // Create a context with safe globals
      const context = {
        console: customConsole,
        // Provide getSecret function
        getSecret,
        // Provide list of available secrets for reference
        AVAILABLE_SECRETS: availableSecrets,
        // Provide common utilities
        axios,
        cheerio,
        fetch: globalThis.fetch,
        Buffer,
        URL,
        URLSearchParams,
        setTimeout,
        clearTimeout,
        Promise,
        Date,
        Math,
        JSON,
        Object,
        Array,
        String,
        Number,
        Boolean,
        RegExp,
        // Helpers for module exports
        module: { exports: {} },
        exports: {},
      };

      logs.push('[SYSTEM] Starting script execution...');

      // Wrap the script in an async function to support top-level await
      const wrappedScript = `
        return (async function() {
          ${scriptContent}
          return module.exports;
        })()
      `;

      // Create a function with the context
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const executeScript = new AsyncFunction(...Object.keys(context), wrappedScript);

      // Execute the script with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Script execution timed out after 5 minutes')), 300000);
      });

      const scriptPromise = executeScript(...Object.values(context));
      const scriptModule = await Promise.race([scriptPromise, timeoutPromise]);

      // Handle different script formats
      let result;

      // Log what we're about to execute
      logs.push(`[SYSTEM] Script module type: ${typeof scriptModule}`);

      if (typeof scriptModule === 'function') {
        // If the script exports a function, call it
        const eventObject = { orgId, taskId };
        logs.push(
          `[SYSTEM] Calling exported function with event object: ${JSON.stringify(eventObject)}`,
        );
        try {
          result = await scriptModule(eventObject);
          logs.push(`[SYSTEM] Function execution completed, result type: ${typeof result}`);
        } catch (funcError) {
          const errorMessage = funcError instanceof Error ? funcError.message : String(funcError);
          logs.push(`[SYSTEM] Function execution error: ${errorMessage}`);
          throw funcError;
        }
      } else if (scriptModule && typeof scriptModule.run === 'function') {
        // If the script exports an object with a run method
        logs.push('[SYSTEM] Calling run method with event object');
        result = await scriptModule.run({ orgId, taskId });
      } else if (scriptModule && typeof scriptModule.default === 'function') {
        // If the script has a default export that's a function
        logs.push('[SYSTEM] Calling default export function with event object');
        result = await scriptModule.default({ orgId, taskId });
      } else {
        // Otherwise, assume the script ran its logic and return the module
        logs.push('[SYSTEM] Returning module as-is');
        result = scriptModule;
      }

      logs.push(`[SYSTEM] Function returned: ${JSON.stringify(result)}`);

      logs.push('[SYSTEM] Script execution completed successfully');

      // Log the output for debugging
      console.log(`[Automation Execution] Script output for ${orgId}/${taskId}:`, result);

      // Create a friendly summary using AI (structured)
      let summary: string | undefined;
      try {
        const { object } = await generateObject({
          ...getModelOptions('gpt-4o-mini'),
          system:
            'You are a helpful assistant that summarizes automation test results. Focus only on describing what happened or what was found. Do not provide advice, suggestions, or commentary. Be factual and concise. 1-2 short sentences.',
          prompt: `Summarize what this automation discovered or accomplished. Focus only on the outcome, not advice.\nRESULT:\n${JSON.stringify(
            result,
          )}\n\nRECENT_LOGS:\n${logs.slice(-20).join('\n')}`,
          schema: z.object({ summary: z.string().min(1) }),
        });
        summary = object.summary;
      } catch {}

      return {
        success: true,
        output: result,
        logs,
        // @ts-expect-error propagate summary to API mapper
        summary,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logs.push(`[SYSTEM] Script execution failed: ${errorMessage}`);
      if (errorStack) {
        logs.push(`[SYSTEM] Stack trace: ${errorStack}`);
      }

      logger.error('Automation script execution failed', {
        error: errorMessage,
        stack: errorStack,
        orgId,
        taskId,
      });

      // Friendly error summary (structured)
      let summary: string | undefined;
      try {
        const { object } = await generateObject({
          ...getModelOptions('gpt-4o-mini'),
          system:
            'You are a helpful assistant that explains an automation test failure to an end-user in a friendly, concise way. Avoid technical jargon. 1-2 short sentences.',
          prompt: `Summarize this failure for an end user.\nERROR:\n${errorMessage}\n\nRECENT_LOGS:\n${logs
            .slice(-20)
            .join('\n')}`,
          schema: z.object({ summary: z.string().min(1) }),
        });
        summary = object.summary;
      } catch {}

      return {
        success: false,
        error: errorMessage,
        logs,
        // @ts-expect-error propagate summary to API mapper
        summary,
      };
    }
  },
});
