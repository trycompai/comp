/**
 * Validation library catalogs for the Input Validation check.
 * Lists the package names we accept as evidence of input validation /
 * sanitization being in place across JS/TS, Python, and PHP ecosystems.
 */

export const JS_VALIDATION_PACKAGES = [
  'zod',
  'yup',
  'joi',
  '@effect/schema',
  'effect',
  'valibot',
  'ajv',
  'class-validator',
  'io-ts',
  'superstruct',
  'runtypes',
];

export const PY_VALIDATION_PACKAGES = [
  'pydantic',
  'marshmallow',
  'cerberus',
  'voluptuous',
  'jsonschema',
  'schematics',
  'typeguard',
];

export const PHP_VALIDATION_PACKAGES = [
  'laravel/framework',
  'respect/validation',
  'symfony/validator',
  'vlucas/valitron',
];

export const VALIDATION_TARGET_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'composer.json',
];
