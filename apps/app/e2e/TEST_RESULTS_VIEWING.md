# Viewing Test Results Online

This guide explains how to view test results directly in your browser without downloading artifacts.

## 🚀 Quick Access Methods

### 1. GitHub Actions Summary (Immediate)

After any test run, click on the workflow run in the Actions tab to see:

- Test statistics (passed/failed/total)
- Failed test details
- Links to debug traces

**How to access:**

1. Go to Actions tab
2. Click on the workflow run
3. Scroll down to see the summary

### 2. GitHub Pages Dashboard (Full Reports)

View comprehensive HTML reports with detailed test results.

**One-time setup:**

1. Go to Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Save

**How to access:**

- After tests complete, the "Deploy Test Results" workflow will run automatically
- Visit: `https://trycompai.github.io/comp/`
- Or check the PR comments for direct links

### 3. Playwright Trace Viewer (Debug Failures)

Debug failed tests with step-by-step execution traces.

**Online viewer:**

1. Download trace.zip from artifacts
2. Visit https://trace.playwright.dev
3. Upload the trace file

**Local viewer:**

```bash
bunx playwright show-trace path/to/trace.zip
```

## 📊 What's Available

### In GitHub Actions Summary:

- ✅ Pass/fail counts
- ❌ Failed test names and files
- 📸 Screenshot/video file listing
- 🔍 Trace viewer instructions

### In GitHub Pages Dashboard:

- 🌐 Chromium test report
- 🦊 Firefox test report
- 🧭 WebKit test report
- 📱 Mobile test reports
- 📈 Coverage reports (unit tests)

### In Trace Files:

- 🎬 Step-by-step test execution
- 🖼️ Screenshots at each step
- 🔍 Network requests
- 📝 Console logs
- ⏱️ Timing information

## 🛠️ Troubleshooting

### Reports not showing on GitHub Pages?

1. Ensure GitHub Pages is enabled in repository settings
2. Wait 2-3 minutes after workflow completion
3. Check the "Deploy Test Results" workflow for errors

### Can't see test summary?

- The summary appears at the bottom of the workflow run page
- Expand the "Generate test summary" step if collapsed

### Need more detailed logs?

- Download the full artifacts for complete logs
- Use the trace viewer for step-by-step debugging

## 🔗 Useful Links

- [Playwright Trace Viewer](https://trace.playwright.dev)
- [GitHub Pages Setup](https://docs.github.com/en/pages/getting-started-with-github-pages)
- [Playwright HTML Reporter](https://playwright.dev/docs/test-reporters#html-reporter)
