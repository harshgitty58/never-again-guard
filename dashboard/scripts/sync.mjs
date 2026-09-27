/**
 * sync.mjs — copy verifier output into the dashboard and extract code snippets.
 *
 *   reports/**            → dashboard/public/reports/**
 *   git (run-1 vs run-2)  → dashboard/public/reports/snippets.json
 *
 * Reports only carry Semgrep messages for variants, so the real before/after
 * source lines are read from the commits that saved each history run.
 * Run from the repo root via `npm run sync-reports`. Needs full git history;
 * on a shallow clone the committed snippets.json is left as is.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DASH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(DASH, '..');
const SRC = path.join(ROOT, 'reports');
const DEST = path.join(DASH, 'public', 'reports');

fs.cpSync(SRC, DEST, { recursive: true, force: true });
console.log(`copied ${path.relative(ROOT, SRC)} → ${path.relative(ROOT, DEST)}`);

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });

function commitFor(dir) {
  return git('log', '-1', '--format=%H', '--', dir).trim();
}

function fileAt(commit, file) {
  try {
    return git('show', `${commit}:${file}`).split(/\r?\n/);
  } catch {
    return null;
  }
}

/** Find the statement in `lines` that replaced `before`, matching on its left-hand side. */
function findAfter(lines, before) {
  const key = before.trim().split(/\s*[=(]/)[0].trim();
  if (!key) return null;
  const start = lines.findIndex((l) => l.trim().startsWith(key));
  if (start === -1) return null;
  const out = [];
  for (let i = start; i < lines.length && out.length < 6; i++) {
    out.push(lines[i]);
    if (/[;{]\s*$/.test(lines[i]) && !/\{\s*$/.test(lines[i])) break;
    if (/\);\s*$/.test(lines[i])) break;
  }
  return { line: start + 1, code: dedent(out) };
}

function dedent(lines) {
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

try {
  const run1 = commitFor('reports/history/run-1');
  const run2 = commitFor('reports/history/run-2');
  if (!run1 || !run2) throw new Error('history runs not committed yet');

  const snippets = { run1Commit: run1.slice(0, 7), run2Commit: run2.slice(0, 7), variants: {} };
  const histDir = path.join(SRC, 'history', 'run-1');
  for (const f of fs.readdirSync(histDir).filter((f) => /^INC-.*\.json$/.test(f))) {
    const report = JSON.parse(fs.readFileSync(path.join(histDir, f), 'utf8'));
    for (const v of report.rule?.variants ?? []) {
      const beforeLines = fileAt(run1, v.file);
      const afterLines = fileAt(run2, v.file);
      if (!beforeLines) continue;
      const before = beforeLines[v.line - 1] ?? '';
      snippets.variants[`${v.file}:${v.line}`] = {
        before: before.trim(),
        after: afterLines ? findAfter(afterLines, before) : null,
      };
    }
  }
  fs.writeFileSync(path.join(DEST, 'snippets.json'), JSON.stringify(snippets, null, 2) + '\n');
  console.log(`wrote snippets.json (${Object.keys(snippets.variants).length} variants, ${snippets.run1Commit} → ${snippets.run2Commit})`);
} catch (err) {
  console.warn(`snippets skipped: ${err.message.split('\n')[0]}`);
}
