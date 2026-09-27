/**
 * run-rule.mjs — run a Semgrep or ESLint rule against a path
 * and parse the matches.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Resolve the semgrep executable.
 * Tries `semgrep` on PATH first, then common install locations.
 * Returns { cmd, args } ready for execFileSync, or null if unavailable.
 */
function resolveSemgrep() {
  // 1. Direct binary on PATH
  try {
    execFileSync('semgrep', ['--version'], { stdio: 'pipe', timeout: 5000 });
    return { cmd: 'semgrep', args: [] };
  } catch { /* not on PATH */ }

  // 2. Common Windows install locations (pip installs to user Scripts dir)
  // Try pysemgrep.exe first (the real Python impl), then semgrep.exe (wrapper that needs PATH)
  if (process.platform === 'win32') {
    const appdata = process.env.APPDATA ?? '';
    const localappdata = process.env.LOCALAPPDATA ?? '';
    const scriptsDirs = [
      path.join(appdata, 'Python', 'Python313', 'Scripts'),
      path.join(appdata, 'Python', 'Python312', 'Scripts'),
      path.join(appdata, 'Python', 'Python311', 'Scripts'),
      path.join(localappdata, 'Programs', 'Python', 'Python313', 'Scripts'),
      path.join(localappdata, 'Programs', 'Python', 'Python312', 'Scripts'),
    ];
    for (const dir of scriptsDirs) {
      for (const exe of ['pysemgrep.exe', 'semgrep.exe']) {
        const candidate = path.join(dir, exe);
        if (fs.existsSync(candidate)) {
          try {
            execFileSync(candidate, ['--version'], { stdio: 'pipe', timeout: 5000 });
            return { cmd: candidate, args: [] };
          } catch { /* try next */ }
        }
      }
    }
  }

  // 3. Python module fallbacks (for Linux/macOS or if direct exe didn't work)
  for (const py of ['python3', 'python']) {
    try {
      // Only use if it exits 0 (semgrep >= 1.38.0 deprecated `python -m semgrep` with exit 1)
      const out = execFileSync(py, ['-m', 'semgrep', '--version'], {
        stdio: 'pipe', timeout: 5000, encoding: 'utf8',
      });
      if (out && out.includes('.')) return { cmd: py, args: ['-m', 'semgrep'] };
    } catch { /* try next */ }
  }

  return null;
}

let _semgrepCmd = undefined; // cached after first call

/**
 * Check whether semgrep is available (direct or via python -m semgrep).
 */
export function semgrepAvailable() {
  if (_semgrepCmd === undefined) _semgrepCmd = resolveSemgrep();
  return _semgrepCmd !== null;
}

/**
 * Run a Semgrep rule YAML against a target directory/file.
 *
 * @param {string} ruleYml - path to the semgrep rule YAML
 * @param {string} targetPath - path to scan
 * @returns {{ matches: Array<{file, line, snippet}>, raw: string, error: string|null }}
 */
export function runSemgrep(ruleYml, targetPath) {
  if (_semgrepCmd === undefined) _semgrepCmd = resolveSemgrep();
  if (!_semgrepCmd) {
    return { matches: [], raw: '', error: 'semgrep not found (tried PATH, py -m semgrep, python3 -m semgrep)' };
  }

  const { cmd, args } = _semgrepCmd;
  let raw = '';
  let error = null;

  try {
    raw = execFileSync(
      cmd,
      [...args, '--config', ruleYml, '--json', targetPath],
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
      const lines = r.extra?.lines?.trim() ?? '';
      // Semgrep sometimes returns "requires login" as lines text (community tier limitation)
      // Fall back to the rule message which is always available
      const snippet = (lines && lines !== 'requires login')
        ? lines
        : (r.extra?.message ?? r.check_id ?? '').slice(0, 80);
      matches.push({
        file: r.path,
        line: r.start?.line ?? 0,
        snippet,
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
