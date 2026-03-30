import type { CheckContext, IntegrationCheck, FindingSeverity } from '../types';
import type {
  DSLStep,
  CheckDefinition,
  SyncDefinition,
  SyncEmployee,
  FetchStep,
  FetchPagesStep,
  ForEachStep,
  AggregateStep,
  BranchStep,
  EmitStep,
  CodeStep,
} from './types';
import { SyncEmployeeSchema } from './types';
import { evaluateCondition, evaluateOperator, resolvePath } from './expression-evaluator';
import { interpolate, interpolateTemplate } from './template-engine';

/**
 * Converts a declarative CheckDefinition (JSON DSL) into an IntegrationCheck
 * with a `run()` function that the existing check-runner can execute.
 */
export function interpretDeclarativeCheck(opts: {
  id: string;
  name: string;
  description: string;
  definition: CheckDefinition;
  taskMapping?: string;
  defaultSeverity?: FindingSeverity;
  variables?: IntegrationCheck['variables'];
}): IntegrationCheck {
  return {
    id: opts.id,
    name: opts.name,
    description: opts.description,
    taskMapping: opts.taskMapping as IntegrationCheck['taskMapping'],
    defaultSeverity: opts.defaultSeverity,
    variables: opts.variables,
    run: async (ctx: CheckContext) => {
      const scope: Record<string, unknown> = {
        variables: ctx.variables,
        credentials: ctx.credentials,
        accessToken: ctx.accessToken,
        connectionId: ctx.connectionId,
        organizationId: ctx.organizationId,
        metadata: ctx.metadata,
      };

      ctx.log(`Running declarative check: ${opts.name}`);

      for (const step of opts.definition.steps) {
        await executeStep(step, scope, ctx, opts.defaultSeverity || 'medium');
      }
    },
  };
}

/**
 * Converts a declarative SyncDefinition (JSON DSL) into a function
 * that produces a validated list of SyncEmployee objects.
 *
 * The sync definition runs the same DSL steps as checks, but instead of
 * emitting pass/fail results, it produces a standardized employee list
 * at `scope[employeesPath]` that the generic sync service can process.
 */
export function interpretDeclarativeSync(opts: {
  definition: SyncDefinition;
  defaultSeverity?: FindingSeverity;
}): {
  run: (ctx: CheckContext) => Promise<SyncEmployee[]>;
} {
  return {
    run: async (ctx: CheckContext) => {
      const scope: Record<string, unknown> = {
        variables: ctx.variables,
        credentials: ctx.credentials,
        accessToken: ctx.accessToken,
        connectionId: ctx.connectionId,
        organizationId: ctx.organizationId,
        metadata: ctx.metadata,
      };

      ctx.log('Running declarative sync');

      for (const step of opts.definition.steps) {
        await executeStep(step, scope, ctx, opts.defaultSeverity || 'medium');
      }

      const employeesPath = opts.definition.employeesPath || 'employees';
      const raw = resolvePath(scope, employeesPath);

      if (!Array.isArray(raw)) {
        throw new Error(
          `Sync definition did not produce an array at scope.${employeesPath}`,
        );
      }

      const employees: SyncEmployee[] = [];
      for (let i = 0; i < raw.length; i++) {
        const parsed = SyncEmployeeSchema.safeParse(raw[i]);
        if (!parsed.success) {
          ctx.warn(
            `Employee at index ${i} failed validation: ${parsed.error.issues.map((iss) => iss.message).join(', ')}`,
          );
          continue;
        }
        employees.push(parsed.data);
      }

      ctx.log(`Sync produced ${employees.length} validated employees`);
      return employees;
    },
  };
}

/**
 * Execute a single DSL step.
 */
async function executeStep(
  step: DSLStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
  defaultSeverity: FindingSeverity,
): Promise<void> {
  switch (step.type) {
    case 'fetch':
      await executeFetch(step, scope, ctx);
      break;
    case 'fetchPages':
      await executeFetchPages(step, scope, ctx);
      break;
    case 'forEach':
      await executeForEach(step, scope, ctx, defaultSeverity);
      break;
    case 'aggregate':
      await executeAggregate(step, scope, ctx, defaultSeverity);
      break;
    case 'branch':
      await executeBranch(step, scope, ctx, defaultSeverity);
      break;
    case 'emit':
      executeEmit(step, scope, ctx, defaultSeverity);
      break;
    case 'code':
      await executeCode(step, scope, ctx, defaultSeverity);
      break;
  }
}

/**
 * Execute a fetch step — single API call.
 */
async function executeFetch(
  step: FetchStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
): Promise<void> {
  const path = interpolate(step.path, scope);
  const params = step.params
    ? Object.fromEntries(
        Object.entries(step.params).map(([k, v]) => [k, interpolate(v, scope)]),
      )
    : undefined;
  const headers = step.headers
    ? Object.fromEntries(
        Object.entries(step.headers).map(([k, v]) => [k, interpolate(v, scope)]),
      )
    : undefined;

  ctx.log(`Fetching ${path}`);

  try {
    let data: unknown;
    const method = step.method || 'GET';

    if (method === 'GET') {
      data = await ctx.fetch(path, { params, headers });
    } else if (method === 'POST') {
      const body = step.body ? JSON.parse(interpolate(JSON.stringify(step.body), scope)) : undefined;
      data = await ctx.post(path, body, { headers });
    } else if (method === 'PUT') {
      const body = step.body ? JSON.parse(interpolate(JSON.stringify(step.body), scope)) : undefined;
      data = await ctx.put(path, body, { headers });
    } else if (method === 'PATCH') {
      const body = step.body ? JSON.parse(interpolate(JSON.stringify(step.body), scope)) : undefined;
      data = await ctx.patch(path, body, { headers });
    } else if (method === 'DELETE') {
      data = await ctx.delete(path, { headers });
    }

    // Extract nested data if dataPath is specified
    if (step.dataPath && data != null && typeof data === 'object') {
      data = resolvePath(data as Record<string, unknown>, step.dataPath);
    }

    scope[step.as] = data;
  } catch (error) {
    const onError = step.onError || 'fail';
    if (onError === 'fail') {
      throw error;
    } else if (onError === 'empty') {
      scope[step.as] = [];
    }
    // 'skip' — just don't set anything
    if (onError === 'skip') {
      scope[step.as] = null;
    }
    ctx.warn(`Fetch failed for ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Execute a fetchPages step — paginated API call.
 */
async function executeFetchPages(
  step: FetchPagesStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
): Promise<void> {
  const path = interpolate(step.path, scope);
  const params = step.params
    ? Object.fromEntries(
        Object.entries(step.params).map(([k, v]) => [k, interpolate(v, scope)]),
      )
    : undefined;

  ctx.log(`Fetching pages from ${path}`);

  try {
    let data: unknown[];

    switch (step.pagination.strategy) {
      case 'cursor':
        data = await ctx.fetchWithCursor(path, {
          cursorParam: step.pagination.cursorParam,
          cursorPath: step.pagination.cursorPath,
          dataPath: step.pagination.dataPath,
          params: { ...params, ...step.pagination.params },
          maxPages: step.pagination.maxPages,
        });
        break;

      case 'page':
        data = await ctx.fetchAllPages(path, {
          pageParam: step.pagination.pageParam,
          perPageParam: step.pagination.perPageParam,
          perPage: step.pagination.perPage,
          maxPages: step.pagination.maxPages,
        });
        // If dataPath specified, extract from each page response
        if (step.pagination.dataPath) {
          // fetchAllPages already flattens, but if data isn't flat, extract
          const extractedData: unknown[] = [];
          for (const item of data) {
            if (item != null && typeof item === 'object') {
              const nested = resolvePath(item as Record<string, unknown>, step.pagination.dataPath);
              if (Array.isArray(nested)) {
                extractedData.push(...nested);
              } else {
                extractedData.push(item);
              }
            } else {
              extractedData.push(item);
            }
          }
          data = extractedData;
        }
        break;

      case 'link':
        data = await ctx.fetchWithLinkHeader(path, {
          params,
          maxPages: step.pagination.maxPages,
        });
        break;

      default:
        throw new Error(`Unknown pagination strategy`);
    }

    scope[step.as] = data;
    ctx.log(`Fetched ${data.length} items from ${path}`);
  } catch (error) {
    const onError = step.onError || 'fail';
    if (onError === 'fail') {
      throw error;
    }
    scope[step.as] = [];
    ctx.warn(`FetchPages failed for ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Execute a forEach step — iterate over a collection and assert conditions.
 */
async function executeForEach(
  step: ForEachStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
  defaultSeverity: FindingSeverity,
): Promise<void> {
  const collection = resolvePath(scope, step.collection);

  if (!Array.isArray(collection)) {
    ctx.warn(`forEach: ${step.collection} is not an array (got ${typeof collection})`);
    return;
  }

  ctx.log(`Iterating over ${collection.length} items in ${step.collection}`);

  let passCount = 0;
  let failCount = 0;
  let filteredCount = 0;

  for (const item of collection) {
    // Create child scope with current item
    const childScope: Record<string, unknown> = {
      ...scope,
      [step.itemAs]: item,
    };

    // Apply filter — skip items that don't match
    if (step.filter) {
      if (!evaluateCondition(step.filter, childScope)) {
        filteredCount++;
        continue;
      }
    }

    // Execute any nested steps first (e.g., fetch details per item)
    if (step.steps) {
      for (const nestedStep of step.steps) {
        await executeStep(nestedStep, childScope, ctx, defaultSeverity);
      }
    }

    // Evaluate all conditions (AND logic)
    const allPass = step.conditions.every((condition) =>
      evaluateCondition(condition, childScope),
    );

    const resourceId = String(resolvePath(childScope, step.resourceIdPath) ?? 'unknown');

    if (allPass) {
      passCount++;
      const result = interpolateTemplate(step.onPass, childScope);
      ctx.pass({
        title: result.title,
        description: result.description || '',
        resourceType: result.resourceType || step.resourceType,
        resourceId: result.resourceId || resourceId,
        evidence: result.evidence || { item, checkedAt: new Date().toISOString() },
      });
    } else {
      failCount++;
      const result = interpolateTemplate(step.onFail, childScope);
      ctx.fail({
        title: result.title,
        description: result.description || '',
        resourceType: result.resourceType || step.resourceType,
        resourceId: result.resourceId || resourceId,
        severity: (result.severity as FindingSeverity) || defaultSeverity,
        remediation: result.remediation || '',
        evidence: result.evidence,
      });
    }
  }

  ctx.log(
    `forEach complete on ${step.collection}: ${passCount} passed, ${failCount} failed${filteredCount > 0 ? `, ${filteredCount} filtered out` : ''}`,
  );
}

/**
 * Execute an aggregate step — count/sum/avg with threshold.
 */
async function executeAggregate(
  step: AggregateStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
  defaultSeverity: FindingSeverity,
): Promise<void> {
  const collection = resolvePath(scope, step.collection);

  if (!Array.isArray(collection)) {
    ctx.warn(`aggregate: ${step.collection} is not an array`);
    return;
  }

  let result: number;

  switch (step.operation) {
    case 'count':
      result = collection.length;
      break;

    case 'countWhere':
      if (!step.filter) {
        result = collection.length;
      } else {
        result = collection.filter((item) => {
          // Evaluate the filter against the item directly as scope
          const itemScope =
            item != null && typeof item === 'object'
              ? (item as Record<string, unknown>)
              : { value: item };
          return evaluateCondition(step.filter!, itemScope);
        }).length;
      }
      break;

    case 'sum':
      result = collection.reduce((acc: number, item) => {
        const val = step.field ? resolvePath(item as Record<string, unknown>, step.field) : item;
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);
      break;

    case 'avg': {
      const sum = collection.reduce((acc: number, item) => {
        const val = step.field ? resolvePath(item as Record<string, unknown>, step.field) : item;
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);
      result = collection.length > 0 ? sum / collection.length : 0;
      break;
    }

    case 'min':
      result = collection.reduce((min: number, item) => {
        const val = step.field ? resolvePath(item as Record<string, unknown>, step.field) : item;
        return typeof val === 'number' ? Math.min(min, val) : min;
      }, Infinity);
      break;

    case 'max':
      result = collection.reduce((max: number, item) => {
        const val = step.field ? resolvePath(item as Record<string, unknown>, step.field) : item;
        return typeof val === 'number' ? Math.max(max, val) : max;
      }, -Infinity);
      break;

    default:
      ctx.warn(`aggregate: unknown operation ${step.operation}`);
      return;
  }

  // Store result in scope if 'as' is specified
  if (step.as) {
    scope[step.as] = result;
  }

  // Evaluate threshold condition
  const childScope = { ...scope, _result: result };
  const passes = evaluateOperator(
    step.condition.operator,
    result,
    step.condition.value,
  );

  ctx.log(`Aggregate ${step.operation} on ${step.collection}: ${result}`);

  if (passes) {
    const tmpl = interpolateTemplate(step.onPass, childScope);
    ctx.pass({
      title: tmpl.title,
      description: tmpl.description || '',
      resourceType: tmpl.resourceType || step.collection,
      resourceId: tmpl.resourceId || step.collection,
      evidence: tmpl.evidence || { operation: step.operation, result, checkedAt: new Date().toISOString() },
    });
  } else {
    const tmpl = interpolateTemplate(step.onFail, childScope);
    ctx.fail({
      title: tmpl.title,
      description: tmpl.description || '',
      resourceType: tmpl.resourceType || step.collection,
      resourceId: tmpl.resourceId || step.collection,
      severity: (tmpl.severity as FindingSeverity) || defaultSeverity,
      remediation: tmpl.remediation || '',
      evidence: tmpl.evidence,
    });
  }
}

/**
 * Execute a branch step — conditional logic.
 */
async function executeBranch(
  step: BranchStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
  defaultSeverity: FindingSeverity,
): Promise<void> {
  const result = evaluateCondition(step.condition, scope);

  ctx.log(`Branch condition evaluated to ${result}`);

  const stepsToRun = result ? step.then : (step.else || []);

  for (const s of stepsToRun) {
    await executeStep(s, scope, ctx, defaultSeverity);
  }
}

/**
 * Execute an emit step — directly emit pass/fail result.
 */
function executeEmit(
  step: EmitStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
  defaultSeverity: FindingSeverity,
): void {
  ctx.log(`Emitting ${step.result} result: ${step.template.title}`);
  const template = interpolateTemplate(step.template, scope);

  if (step.result === 'pass') {
    ctx.pass({
      title: template.title,
      description: template.description || '',
      resourceType: template.resourceType || 'check',
      resourceId: template.resourceId || 'check',
      evidence: template.evidence || { checkedAt: new Date().toISOString() },
    });
  } else {
    ctx.fail({
      title: template.title,
      description: template.description || '',
      resourceType: template.resourceType || 'check',
      resourceId: template.resourceId || 'check',
      severity: (template.severity as FindingSeverity) || defaultSeverity,
      remediation: template.remediation || '',
      evidence: template.evidence,
    });
  }
}

/**
 * Execute a code step — run arbitrary JavaScript with access to ctx and scope.
 */
async function executeCode(
  step: CodeStep,
  scope: Record<string, unknown>,
  ctx: CheckContext,
  _defaultSeverity: FindingSeverity,
): Promise<void> {
  const codePreview = step.code.length > 100
    ? step.code.slice(0, 100) + '...'
    : step.code;
  ctx.log(`Executing code step: ${codePreview.replace(/\n/g, ' ').trim()}`);

  const scopeKeysBefore = Object.keys(scope);

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFunction('ctx', 'scope', step.code);
    await fn(ctx, scope);

    // Log scope changes for debugging
    const scopeKeysAfter = Object.keys(scope);
    const newKeys = scopeKeysAfter.filter((k) => !scopeKeysBefore.includes(k));
    if (newKeys.length > 0) {
      ctx.log(`Code step added scope keys: ${newKeys.join(', ')}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    ctx.error(`Code step failed: ${message}`, {
      code: step.code,
      ...(stack ? { stack } : {}),
    });
    throw error;
  }
}
