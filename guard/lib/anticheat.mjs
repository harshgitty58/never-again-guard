/**
 * anticheat.mjs — validate a regression test file for fairness.
 *
 * Rules (any violation → FAILED):
 *   1. File contains at least one expect( call
 *   2. No .skip, .todo, .only modifiers
 *   3. Does not vi.mock() the module under test (the guard's own test file path)
 *   4. Does not import from guards/ (except itself)
 */
import fs from 'fs';
import path from 'path';

/**
 * @param {string} testPath - absolute path to the test file
 * @returns {{ passed: boolean, checks: string[], violations: string[] }}
 */
export function anticheat(testPath) {
  const checks = [];
  const violations = [];

  let src;
  try {
    src = fs.readFileSync(testPath, 'utf8');
  } catch (err) {
    violations.push(`cannot-read-test: ${err.message}`);
    return { passed: false, checks, violations };
  }

  // 1. Must have at least one expect(
  checks.push('has-expect');
  if (!/\bexpect\s*\(/.test(src)) {
    violations.push('no-expect: test file has no expect() call');
  }

  // 2. No .skip / .todo / .only
  checks.push('no-skip');
  if (/\.(skip|todo|only)\b/.test(src)) {
    violations.push('has-skip-todo-only: test uses .skip, .todo, or .only');
  }

  // 3. Does not vi.mock() the module under test
  // Heuristic: find any vi.mock() call pointing to shoplite/src
  checks.push('no-self-mock');
  const mockMatches = src.match(/vi\.mock\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
  for (const m of mockMatches) {
    const modPath = m.match(/['"`]([^'"`]+)['"`]/)?.[1] || '';
    if (modPath.includes('shoplite/src') || modPath.startsWith('../src')) {
      violations.push(`self-mock: mocks the module under test: ${modPath}`);
    }
  }

  // 4. Does not import from guards/ (except itself)
  checks.push('no-guards-import');
  const importMatches = src.match(/from\s+['"`]([^'"`]+)['"`]/g) || [];
  for (const m of importMatches) {
    const modPath = m.match(/['"`]([^'"`]+)['"`]/)?.[1] || '';
    if (modPath.includes('guards/') && !modPath.includes(path.basename(testPath))) {
      violations.push(`guards-import: imports from guards/ (${modPath})`);
    }
  }

  return {
    passed: violations.length === 0,
    checks,
    violations,
  };
}
