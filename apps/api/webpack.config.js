const { readFileSync } = require('fs');
const path = require('path');

const esmCache = new Map();

function isEsmPackage(request) {
  const pkgName = request.startsWith('@')
    ? request.split('/').slice(0, 2).join('/')
    : request.split('/')[0];

  if (esmCache.has(pkgName)) return esmCache.get(pkgName);

  const candidates = [
    path.resolve(__dirname, 'node_modules', pkgName, 'package.json'),
    path.resolve(__dirname, '../../node_modules', pkgName, 'package.json'),
  ];

  for (const candidate of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf-8'));
      const isEsm = pkg.type === 'module';
      esmCache.set(pkgName, isEsm);
      return isEsm;
    } catch {
      continue;
    }
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
    },
    externals: [
      function ({ request }, callback) {
        if (!request || request.startsWith('.') || request.startsWith('/')) {
          return callback();
        }
        if (request === '@db' || request.startsWith('@/')) {
          return callback();
        }
        if (/^@trycompai\//.test(request)) {
          return callback();
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
