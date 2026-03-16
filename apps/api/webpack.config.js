const { readFileSync, existsSync } = require('fs');
const path = require('path');

const FORCE_BUNDLE = [
  /^@trycompai\//,
  /^better-auth/,
  /^@better-auth\//,
  /^nanoid/,
  /^jose/,
  /^@ai-sdk\//,
  /^ai$/,
  /^@mendable\//,
  /^@upstash\//,
];

const FORCE_EXTERNAL = [
  /^@prisma\//,
  /^prisma$/,
];

const esmCache = new Map();

function isEsmPackage(request) {
  const pkgName = request.startsWith('@')
    ? request.split('/').slice(0, 2).join('/')
    : request.split('/')[0];

  if (esmCache.has(pkgName)) return esmCache.get(pkgName);

  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', pkgName, 'package.json');
    if (existsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf-8'));
        const isEsm = pkg.type === 'module';
        esmCache.set(pkgName, isEsm);
        return isEsm;
      } catch {
        break;
      }
    }
    dir = path.dirname(dir);
  }

  esmCache.set(pkgName, false);
  return false;
}

module.exports = function (options) {
  return {
    ...options,
    cache: { type: 'filesystem' },
    optimization: {
      ...options.optimization,
      minimize: false,
      splitChunks: false,
      runtimeChunk: false,
    },
    output: {
      ...options.output,
      asyncChunks: false,
    },
    externals: [
      function ({ request }, callback) {
        if (!request || request.startsWith('.') || request.startsWith('/')) {
          return callback();
        }
        if (request === '@db' || request.startsWith('@/')) {
          return callback();
        }
        if (FORCE_BUNDLE.some((p) => p.test(request))) {
          return callback();
        }
        if (FORCE_EXTERNAL.some((p) => p.test(request))) {
          return callback(null, `commonjs ${request}`);
        }
        if (isEsmPackage(request)) {
          return callback();
        }
        return callback(null, `commonjs ${request}`);
      },
    ],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: true,
                },
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                },
                target: 'es2022',
              },
              module: { type: 'commonjs' },
            },
          },
        },
      ],
    },
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@': path.resolve(__dirname, 'src'),
        '@db': path.resolve(__dirname, 'prisma/index'),
      },
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
  };
};
