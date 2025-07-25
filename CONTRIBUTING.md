# Contributing to Comp AI

Contributions are what makes the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## House rules

- Before submitting a new issue or PR, check if it already exists in [issues](https://github.com/trycompai/comp/issues) or [PRs](https://github.com/trycompai/comp/pulls).
- GitHub issues: take note of the `🚨 needs approval` label.
  - **For Contributors**:
    - Feature Requests: Wait for a core member to approve and remove the `🚨 needs approval` label before you start coding or submit a PR.
    - Bugs, Security, Performance, Documentation, etc.: You can start coding immediately, even if the `🚨 needs approval` label is present. This label mainly concerns feature requests.
  - **Our Process**:
    - Issues from non-core members automatically receive the `🚨 needs approval` label.
    - We greatly value new feature ideas. To ensure consistency in the product's direction, they undergo review and approval.

## Priorities

<table>
  <tr>
    <td>
      Type of Issue
    </td>
    <td>
      Priority
    </td>
  </tr>
  <tr>
    <td>
      Minor improvements, non-core feature requests
    </td>
    <td>
      <a href="https://github.com/trycompai/comp/issues?q=is:issue+is:open+sort:updated-desc+label:%22Low+priority%22">
        <img src="https://img.shields.io/badge/-Low%20Priority-green">
      </a>
    </td>
  </tr>
   <tr>
    <td>
      Confusing UX (... but working)
    </td>
    <td>
      <a href="https://github.com/trycompai/comp/issues?q=is:issue+is:open+sort:updated-desc+label:%22Medium+priority%22">
        <img src="https://img.shields.io/badge/-Medium%20Priority-yellow">
      </a>
    </td>
  </tr>
  <tr>
    <td>
      Core Features (Booking page, availability, timezone calculation)
    </td>
    <td>
      <a href="https://github.com/trycompai/comp/issues?q=is:issue+is:open+sort:updated-desc+label:%22High+priority%22">
        <img src="https://img.shields.io/badge/-High%20Priority-orange">
      </a>
    </td>
  </tr>
  <tr>
    <td>
      Core Bugs (Login, Booking page, Emails are not working)
    </td>
    <td>
      <a href="https://github.com/trycompai/comp/issues?q=is:issue+is:open+sort:updated-desc+label:Urgent">
        <img src="https://img.shields.io/badge/-Urgent-red">
      </a>
    </td>
  </tr>
</table>

## Developing

The development branch is `dev`. This is the branch that all pull
requests should be made against. We will merge into main every week.

To develop locally:

1. [Fork](https://github.com/trycompai/comp/fork/) this repository to your
   own GitHub account and then
   [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device.
2. Create a new branch:

   ```sh
   git checkout -b MY_BRANCH_NAME
   ```

3. Install bun:

   https://bun.sh/docs/installation

4. Install the dependencies with:

   ```sh
   bun i
   ```

5. Set up your `.env` file:
   - Duplicate `.env.example` to `.env`.
   - Use `openssl rand -base64 32` to generate a key and add it under `SECRET_KEY` in the `.env` file.
   - Setup Trigger.dev
     - CD into apps/app and run `bunx trigger.dev@latest login`, then `bunx trigger.dev@latest dev`
     - Use `openssl rand -base64 32` to generate a key and add it under `TRIGGER_SECRET_KEY` in the `.env` file.

6. Start developing and watch for code changes:

   ```sh
   bun run dev
   ```

## Building

You can build the project with:

```bash
bun run build
```

Please be sure that you can make a full production build before pushing code.

## Testing

Coming soon.

### Running tests

Coming soon.

#### Resolving issues

## Linting

To check the formatting of your code:

```sh
bun run lint
```

If you get errors, be sure to fix them before committing.

## Making a Pull Request

- Be sure to [check the "Allow edits from maintainers" option](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/allowing-changes-to-a-pull-request-branch-created-from-a-fork) while creating your PR.
- If your PR refers to or fixes an issue, be sure to add `refs #XXX` or `fixes #XXX` to the PR description. Replacing `XXX` with the respective issue number. See more about [Linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue).
- Be sure to fill the PR Template accordingly.

Lastly, make sure to keep the branches updated (e.g. click the `Update branch` button on GitHub PR).
