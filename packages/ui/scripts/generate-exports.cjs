const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

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
  // Use glob to find all .js files recursively in components directory
  const componentFiles = glob.sync('**/*.js', { cwd: componentsDir });

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
  const utilFiles = glob.sync('**/*.js', { cwd: utilsDir });

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
  const hookFiles = glob.sync('**/*.js', { cwd: hooksDir });

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
