// Use a space-free product name for Linux to avoid path issues
const isLinuxBuild =
  process.argv.includes('--linux') || process.env.BUILD_TARGET === 'linux';

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'ai.trycomp.device-agent',
  productName: isLinuxBuild ? 'comp-ai-device-agent' : 'Comp AI Device Agent',
  directories: {
    buildResources: 'assets',
    output: 'release',
  },
  asar: true,
  files: [
    'dist/main/**/*',
    'dist/preload/**/*',
    'dist/renderer/**/*',
    'assets/**/*',
    '!node_modules/**/{test,tests,__tests__,spec}/**',
    '!node_modules/**/*.{md,ts,map}',
    '!node_modules/**/{.github,.vscode}/**',
  ],
  electronLanguages: ['en-US'],
  extraResources: [
    {
      from: 'assets/',
      to: 'assets/',
      filter: ['**/*.png'],
    },
  ],
  icon: 'assets/icon.png',
  mac: {
    category: 'public.app-category.utilities',
    icon: 'assets/icon.icns',
    artifactName: 'CompAI-Device-Agent-${version}-${arch}.${ext}',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
    ],
    hardenedRuntime: true,
    entitlements: 'assets/entitlements.mac.plist',
    entitlementsInherit: 'assets/entitlements.mac.plist',
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: false,
    artifactName: 'CompAI-Device-Agent-${version}-setup.${ext}',
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64'],
      },
    ],
    category: 'Utility',
    artifactName: 'CompAI-Device-Agent-${version}-${arch}.${ext}',
    executableName: 'comp-ai-device-agent',
  },
  deb: {
    afterInstall: 'assets/linux/after-install.sh',
    packageName: 'comp-ai-device-agent',
    compression: 'xz',
  },
  publish: {
    provider: 'generic',
    url: process.env.AUTO_UPDATE_URL || 'https://portal.trycomp.ai/api/device-agent/updates',
  },
};
