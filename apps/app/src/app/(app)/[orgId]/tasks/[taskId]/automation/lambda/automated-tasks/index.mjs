import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const s3 = new S3Client({});
const sm = new SecretsManagerClient({});
const baseRequire = createRequire(import.meta.url);

async function getSecret(orgId, name) {
  const res = await sm.send(new GetSecretValueCommand({ SecretId: `org/${orgId}` }));
  const payload = res.SecretString
    ? JSON.parse(res.SecretString)
    : JSON.parse(Buffer.from(res.SecretBinary, 'base64').toString('utf8'));
  return payload[name];
}

export const handler = async (event) => {
  const { orgId, taskId } = event;

  const { Body } = await s3.send(
    new GetObjectCommand({
      Bucket: 'comp-testing-lambda-tasks',
      Key: `${orgId}/${taskId}.js`,
    }),
  );
  const code = await Body.transformToString();

  const sandbox = {
    console,
    Buffer,
    fetch: globalThis.fetch,
    URL: globalThis.URL,
    URLSearchParams: globalThis.URLSearchParams,
    AbortController: globalThis.AbortController,
    setTimeout,
    clearTimeout,
    getSecret,
  };
  const context = vm.createContext(sandbox);

  const wrapped = `
    (function (exports, require, module, __filename, __dirname) {
      "use strict";
      ${code}
      return module.exports;
    })
  `;
  const script = new vm.Script(wrapped, { filename: `${taskId}.js` });
  const factory = script.runInContext(context, { timeout: 3000 });

  const module = { exports: {} };
  const fnOrExports = factory(module.exports, baseRequire, module, `${taskId}.js`, '/tmp');

  const taskExport = typeof fnOrExports === 'function' ? fnOrExports : module.exports;
  const taskFn =
    typeof taskExport === 'function'
      ? taskExport
      : typeof taskExport?.handler === 'function'
        ? taskExport.handler
        : null;

  if (!taskFn) throw new Error('Task module must export a function or { handler: fn }');

  return await taskFn(event, {});
};
