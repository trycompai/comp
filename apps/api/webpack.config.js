const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        modulesDir: path.resolve(__dirname, 'node_modules'),
        allowlist: [/^@trycompai\//],
      }),
      nodeExternals({
        modulesDir: path.resolve(__dirname, '../../node_modules'),
        allowlist: [/^@trycompai\//],
      }),
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
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
  };
};
