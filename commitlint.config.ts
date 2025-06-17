export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0, 'always', Number.POSITIVE_INFINITY], // Disable body line length rule
    'header-max-length': [0, 'always', Number.POSITIVE_INFINITY], // Disable header line length rule
  },
};
