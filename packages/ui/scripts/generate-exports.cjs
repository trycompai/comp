const fs = require('fs');
const path = require('path');

// Recursively list *.js files relative to `dir`, using forward slashes.
// Avoids the `glob` package (glob→minimatch→brace-expansion pulls in a
// balanced-match resolution that is fragile under bun's hoisting on CI).
function listJsFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.js'))
    .map((f) => f.split(path.sep).join('/'))
    .sort();
}

const pkgPath = path.join(__dirname, '../package.json');
const componentsDir = path.join(__dirname, '../dist/components');
const utilsDir = path.join(__dirname, '../dist/utils');
const hooksDir = path.join(__dirname, '../dist/hooks');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Create ESM-only exports structure
const exportsField = {
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
  },
};

// Add main CSS/config exports
exportsField['./globals.css'] = './dist/globals.css';
exportsField['./editor.css'] = './dist/editor.css';
exportsField['./tailwind.config'] = './tailwind.config.ts';
exportsField['./postcss.config'] = './postcss.config.js';

// Add all component subpath exports (ESM only) including nested directories
if (fs.existsSync(componentsDir)) {
  const componentFiles = listJsFiles(componentsDir);

  componentFiles.forEach((file) => {
    const name = file.replace(/\.js$/, '');
    const exportPath = `./${name}`;

    exportsField[exportPath] = {
      types: `./dist/components/${name}.d.ts`,
      import: `./dist/components/${name}.js`,
    };
  });
}

// Add all utils exports
if (fs.existsSync(utilsDir)) {
  const utilFiles = listJsFiles(utilsDir);

  utilFiles.forEach((file) => {
    const name = file.replace(/\.js$/, '');
    const exportPath = `./${name}`;

    exportsField[exportPath] = {
      types: `./dist/utils/${name}.d.ts`,
      import: `./dist/utils/${name}.js`,
    };
  });
}

// Add all hooks exports
if (fs.existsSync(hooksDir)) {
  const hookFiles = listJsFiles(hooksDir);

  hookFiles.forEach((file) => {
    const name = file.replace(/\.js$/, '');
    const exportPath = `./${name}`;

    exportsField[exportPath] = {
      types: `./dist/hooks/${name}.d.ts`,
      import: `./dist/hooks/${name}.js`,
    };
  });
}

pkg.exports = exportsField;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(
  '✅ package.json exports updated with ESM-only format including components, utils, and hooks!',
);
