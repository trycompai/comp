module.exports = {
  branches: ["release"], // Branches to release from
  plugins: [
    "@semantic-release/commit-analyzer", // Analyzes commit messages
    "@semantic-release/release-notes-generator", // Generates release notes
    [
      "semantic-release-discord-notifier",
      {
        embedJson: {
          title: "New Release of Comp AI: ${nextRelease.version}",
          description: "${nextRelease.notes}",
          color: 5814783,
        },
      },
    ],
    "@semantic-release/changelog", // Updates the CHANGELOG.md file
    ["@semantic-release/npm", { npmPublish: false }],
    [
      "@semantic-release/git", // Commits package.json and CHANGELOG.md
      {
        assets: ["package.json", "bun.lockb", "CHANGELOG.md"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    "@semantic-release/github", // Creates a GitHub release
  ],
};
