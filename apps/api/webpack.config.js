const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
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
