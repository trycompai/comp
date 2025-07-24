module.exports = {
  branches: ['release'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      'semantic-release-discord-notifier',
      {
        embedJson: {
          title: 'New Release of Comp AI: ${nextRelease.version}',
          description: '${nextRelease.notes}',
          color: 5814783,
        },
      },
    ],
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: false, // Root package stays private
      },
    ],
    // Publish each package individually
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        pkgRoot: 'packages/db',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        pkgRoot: 'packages/email',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        pkgRoot: 'packages/kv',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        pkgRoot: 'packages/ui',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'bun.lockb', 'CHANGELOG.md', 'packages/*/package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    '@semantic-release/github',
  ],
};
