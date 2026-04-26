#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');
const nodeModulesPath = path.join(cwd, 'node_modules');
const fixMode = process.argv.includes('--fix');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(pkgPath)) {
  fail('[doctor:deps] package.json not found in current directory.');
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const depNames = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

const mustCheck = ['vite', '@vitejs/plugin-react', 'react', 'typescript']
  .filter((name) => depNames.has(name));

if (!fs.existsSync(nodeModulesPath)) {
  fail('[doctor:deps] node_modules is missing. Run: pnpm install');
}

const issues = [];

for (const name of mustCheck) {
  const depPath = path.join(nodeModulesPath, ...name.split('/'));
  if (!fs.existsSync(depPath)) {
    issues.push(`${name}: missing from node_modules`);
    continue;
  }

  let stat;
  try {
    stat = fs.lstatSync(depPath);
  } catch (err) {
    issues.push(`${name}: unable to stat path (${err.message})`);
    continue;
  }

  if (!stat.isSymbolicLink()) {
    continue;
  }

  let linkTarget;
  try {
    linkTarget = fs.readlinkSync(depPath);
  } catch (err) {
    issues.push(`${name}: unable to read symlink (${err.message})`);
    continue;
  }

  const resolved = path.resolve(path.dirname(depPath), linkTarget);
  const normalizedResolved = path.normalize(resolved).toLowerCase();
  const normalizedProject = path.normalize(cwd).toLowerCase();
  const normalizedNodeModules = path.normalize(nodeModulesPath).toLowerCase();

  if (!fs.existsSync(resolved)) {
    issues.push(`${name}: symlink target does not exist -> ${resolved}`);
    continue;
  }

  const inProject = normalizedResolved.startsWith(`${normalizedProject}${path.sep}`);
  const inNodeModules = normalizedResolved.startsWith(`${normalizedNodeModules}${path.sep}`);

  if (!inProject && !inNodeModules) {
    issues.push(`${name}: symlink points outside current project -> ${resolved}`);
  }
}

if (issues.length === 0) {
  process.stdout.write('[doctor:deps] OK: dependency links look healthy.\n');
  process.exit(0);
}

process.stderr.write('[doctor:deps] Detected dependency link issues:\n');
for (const issue of issues) {
  process.stderr.write(`  - ${issue}\n`);
}

if (!fixMode) {
  process.stderr.write('\n[doctor:deps] Fix by running: pnpm run doctor:deps:fix\n');
  process.stderr.write('[doctor:deps] Or run: pnpm install --force\n');
  process.exit(1);
}

process.stdout.write('[doctor:deps] Running: pnpm install --force\n');
const result = spawnSync('pnpm', ['install', '--force'], {
  cwd,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  fail(`[doctor:deps] Auto-fix failed with exit code ${result.status ?? 'unknown'}.`);
}

process.stdout.write('[doctor:deps] Auto-fix complete.\n');
