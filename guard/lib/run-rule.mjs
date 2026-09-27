/**
 * run-rule.mjs — run a Semgrep or ESLint rule against a path
 * and parse the matches.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Check whether semgrep is available on PATH.
 */
export function semgrepAvailable() {
  try {
    execFileSync('semgrep', ['--version'], { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a Semgrep rule YAML against a target directory/file.
 *
 * @param {string} ruleYml - path to the semgrep rule YAML
 * @param {string} targetPath - path to scan
 * @returns {{ matches: Array<{file, line, snippet}>, raw: string, error: string|null }}
 */
export function runSemgrep(ruleYml, targetPath) {
  let raw = '';
  let error = null;

  try {
    raw = execFileSync(
      'semgrep',
      ['--config', ruleYml, '--json', targetPath],
      {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000,
        env: { ...process.env, SEMGREP_SEND_METRICS: 'off' },
      }
    );
  } catch (err) {
    raw = err.stdout ?? '';
    error = (err.stderr ?? err.message ?? '').slice(0, 300);
    // semgrep exits 1 when there are findings — that's normal, not an error
    if (raw.includes('"results"')) {
      error = null;
    }
  }

  const matches = [];
  try {
    const parsed = JSON.parse(raw);
    for (const r of parsed.results ?? []) {
      matches.push({
        file: r.path,
        line: r.start?.line ?? 0,
        snippet: r.extra?.lines?.trim() ?? '',
      });
    }
  } catch {
    // Can't parse — return empty with error
    if (!error) error = `semgrep output not valid JSON: ${raw.slice(0, 100)}`;
  }

  return { matches, raw: raw.slice(0, 500), error };
}

/**
 * Run an ESLint flat-config rule against a target directory/file.
 * The rule file must export a flat config array.
 *
 * @param {string} ruleFile - path to the eslint flat config JS file
 * @param {string} targetPath - path to scan
 * @returns {{ matches: Array<{file, line, snippet}>, raw: string, error: string|null }}
 */
export function runEslint(ruleFile, targetPath) {
  let raw = '';
  let error = null;

  try {
    raw = execFileSync(
      process.execPath,
      [
        path.join(process.cwd(), 'node_modules', '.bin', 'eslint'),
        '--no-eslintrc',
        '--format', 'json',
        '--rule-path', ruleFile,
        targetPath,
      ],
      {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000,
      }
    );
  } catch (err) {
    raw = err.stdout ?? '';
    error = (err.stderr ?? err.message ?? '').slice(0, 300);
    if (raw.startsWith('[')) error = null; // JSON output even on findings
  }

  const matches = [];
  try {
    const results = JSON.parse(raw);
    for (const file of results) {
      for (const msg of file.messages ?? []) {
        matches.push({
          file: file.filePath,
          line: msg.line ?? 0,
          snippet: msg.message ?? '',
        });
      }
    }
  } catch {
    if (!error) error = `eslint output not valid JSON: ${raw.slice(0, 100)}`;
  }

  return { matches, raw: raw.slice(0, 500), error };
}

/**
 * Dispatch to the appropriate rule engine based on guard.json's rule.engine.
 *
 * @param {{ engine: string, path: string }} rule
 * @param {string} targetPath
 * @param {string} repoRoot
 * @returns {{ matches, raw, error }}
 */
export function runRule(rule, targetPath, repoRoot) {
  const absRulePath = path.resolve(repoRoot, rule.path);
  const absTargetPath = path.resolve(repoRoot, targetPath);

  if (rule.engine === 'semgrep') {
    return runSemgrep(absRulePath, absTargetPath);
  }
  if (rule.engine === 'eslint') {
    return runEslint(absRulePath, absTargetPath);
  }
  return { matches: [], raw: '', error: `unknown engine: ${rule.engine}` };
}
