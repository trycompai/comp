'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function findWorkspaceManifests() {
  const out = [];
  for (const top of ['apps', 'packages']) {
    const dir = path.join(root, top);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (!fs.statSync(p).isDirectory()) continue;
      const manifest = path.join(p, 'package.json');
      if (fs.existsSync(manifest)) out.push(manifest);
    }
  }
  return out;
}

const manifests = findWorkspaceManifests();

const nameToDir = new Map();
const nameToVersion = new Map();
for (const m of manifests) {
  try {
    const pkg = JSON.parse(fs.readFileSync(m, 'utf8'));
    if (pkg.name) {
      nameToDir.set(pkg.name, path.dirname(m));
      nameToVersion.set(pkg.name, pkg.version);
    }
  } catch {}
}

const SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
let converted = 0;

for (const m of manifests) {
  const pkg = JSON.parse(fs.readFileSync(m, 'utf8'));
  const dir = path.dirname(m);
  let changed = false;
  for (const s of SECTIONS) {
    if (!pkg[s]) continue;
    for (const [name, spec] of Object.entries(pkg[s])) {
      if (typeof spec !== 'string') continue;
      const isWorkspaceSpec = spec.startsWith('workspace:');
      const isLocalName = nameToDir.has(name);
      const isExactLocalVersion = isLocalName && spec === nameToVersion.get(name);
      if (!isWorkspaceSpec && !isExactLocalVersion) continue;
      const target = nameToDir.get(name);
      if (!target) {
        throw new Error(`[convert-workspace-specs] no local workspace for "${name}" (required by ${m})`);
      }
      let rel = path.relative(dir, target);
      if (!rel.startsWith('.')) rel = './' + rel;
      pkg[s][name] = 'file:' + rel;
      changed = true;
      converted++;
    }
  }
  if (changed) fs.writeFileSync(m, JSON.stringify(pkg, null, 2) + '\n');
}

console.log(`[convert-workspace-specs] converted ${converted} workspace specs across ${manifests.length} manifests`);
