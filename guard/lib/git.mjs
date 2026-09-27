/**
 * git.mjs — git worktree helpers for the verifier.
 * Uses child_process.execFileSync for all git operations.
 */
import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Create a detached git worktree at `dest` for the given ref.
 * On Windows, links node_modules via a junction (no admin required).
 */
export function createWorktree(dest, ref, repoRoot) {
  // Remove stale worktree if it exists
  if (fs.existsSync(dest)) {
    removeWorktree(dest, repoRoot);
  }

  execFileSync('git', ['worktree', 'add', '--detach', dest, ref], {
    cwd: repoRoot,
    stdio: 'pipe',
  });

  // Link shoplite/node_modules via junction so tests can run without npm install
  const srcModules = path.join(repoRoot, 'shoplite', 'node_modules');
  const destModules = path.join(dest, 'shoplite', 'node_modules');
  if (fs.existsSync(srcModules) && !fs.existsSync(destModules)) {
    // Use junction on Windows (works without admin); symlink on Unix
    try {
      fs.symlinkSync(srcModules, destModules, 'junction');
    } catch {
      // If junction fails (e.g. cross-device), copy is not feasible — skip.
      // Tests may fail with a module-not-found error, which the verifier will catch.
    }
  }
}

/**
 * Remove a git worktree (force, then prune).
 */
export function removeWorktree(dest, repoRoot) {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', dest], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
  } catch {
    // If remove fails, try prune
  }
  try {
    execFileSync('git', ['worktree', 'prune'], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
  } catch {
    // Best-effort cleanup
  }
  // Also try rmdir as last resort
  if (fs.existsSync(dest)) {
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }
}

/**
 * Returns the absolute repo root (directory containing .git).
 */
export function getRepoRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
}
