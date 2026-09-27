/**
 * run-test.mjs — run a vitest regression test inside a worktree
 * and parse the JSON output to determine pass/fail and failure type.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Copy a test file into the worktree's shoplite/test/ directory.
 * Returns the destination path.
 */
export function copyTestToWorktree(testSrcPath, worktreePath) {
  const destDir = path.join(worktreePath, 'shoplite', 'test');
  fs.mkdirSync(destDir, { recursive: true });
  const destFile = path.join(destDir, path.basename(testSrcPath));
  fs.copyFileSync(testSrcPath, destFile);
  return destFile;
}

/**
 * Run vitest on a single test file inside the worktree.
 *
 * @param {string} testFile - filename (basename) of the test inside shoplite/test/
 * @param {string} worktreePath - absolute path to the git worktree
 * @returns {{ exit: number, failedOn: 'assertion'|'error'|null, excerpt: string, ms: number, raw: string }}
 */
export function runTest(testFile, worktreePath) {
  const shopliteDir = path.join(worktreePath, 'shoplite');
  const resultJsonPath = path.join(worktreePath, '_vitest_result.json');
  const start = Date.now();

  let rawOutput = '';
  let exitCode = 0;

  // Call vitest's .mjs entry point directly to avoid platform-specific .cmd/.sh issues
  const vitestMjs = path.join(shopliteDir, 'node_modules', 'vitest', 'vitest.mjs');

  try {
    rawOutput = execFileSync(
      process.execPath, // node
      [
        vitestMjs,
        'run',
        path.join('test', testFile),
        '--reporter=json',
        `--outputFile=${resultJsonPath}`,
      ],
      {
        cwd: shopliteDir,
        encoding: 'utf8',
        env: { ...process.env, TZ: 'UTC', FORCE_COLOR: '0' },
        timeout: 30000,
      }
    );
  } catch (err) {
    exitCode = err.status ?? 1;
    rawOutput = (err.stdout ?? '') + (err.stderr ?? '');
  }

  const ms = Date.now() - start;

  // Parse the JSON result file
  let failedOn = null;
  let excerpt = '';

  if (fs.existsSync(resultJsonPath)) {
    try {
      const result = JSON.parse(fs.readFileSync(resultJsonPath, 'utf8'));
      const tests = result.testResults ?? [];
      for (const suite of tests) {
        for (const t of suite.assertionResults ?? []) {
          if (t.status === 'failed') {
            const msg = (t.failureMessages ?? []).join('\n');
            // If the failure message contains AssertionError or "expected" it's an assertion failure
            if (/AssertionError|expected|toBe|toEqual|toThrow|received/i.test(msg)) {
              failedOn = 'assertion';
            } else {
              failedOn = 'error';
            }
            // Take first 200 chars as excerpt
            excerpt = msg.slice(0, 200).replace(/\x1b\[[0-9;]*m/g, '').trim();
            break;
          }
        }
        if (failedOn) break;
      }
      // exitCode from file result
      if (exitCode === 0 && result.success === false) {
        exitCode = 1;
        if (!failedOn) failedOn = 'error';
      }
    } catch {
      // JSON parse failed — treat as error
      if (exitCode !== 0) failedOn = 'error';
    }
  } else if (exitCode !== 0) {
    // No JSON result — check raw output for clues
    if (/AssertionError|expected|toBe|toEqual|toThrow|received/i.test(rawOutput)) {
      failedOn = 'assertion';
    } else {
      failedOn = 'error';
    }
    excerpt = rawOutput.slice(0, 200).replace(/\x1b\[[0-9;]*m/g, '').trim();
  }

  // Clean up result file
  try { fs.unlinkSync(resultJsonPath); } catch { /* ignore */ }

  return { exit: exitCode, failedOn, excerpt, ms, raw: rawOutput.slice(0, 500) };
}
