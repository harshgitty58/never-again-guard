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
  const srcModules = path.resolve(repoRoot, 'shoplite', 'node_modules');
  const destModules = path.join(dest, 'shoplite', 'node_modules');
  if (fs.existsSync(srcModules) && !fs.existsSync(destModules)) {
    // Use junction on Windows (works without admin); symlink on Unix
    try {
      if (process.platform === 'win32') {
        // On Windows, use mklink /J which is more reliable than fs.symlinkSync for junctions
        execFileSync('cmd', ['/c', 'mklink', '/J', destModules, srcModules], { stdio: 'pipe' });
      } else {
        fs.symlinkSync(srcModules, destModules, 'junction');
      }
    } catch (e) {
      // If junction fails, try fs.symlinkSync as fallback
      try {
        fs.symlinkSync(srcModules, destModules, 'junction');
      } catch {
        // Junction not possible — tests will fail with MODULE_NOT_FOUND
      }
    }
  }
}

/**
 * Remove a git worktree (force, then prune).
 */
export function removeWorktree(dest, repoRoot) {
  // Unlink the node_modules junction FIRST. `git worktree remove --force` on
  // Windows follows junctions and deletes the target's contents, which would
  // wipe the real shoplite/node_modules.
  unlinkModulesJunction(dest);
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
 * Remove the shoplite/node_modules link inside a worktree without touching
 * the directory it points to.
 */
function unlinkModulesJunction(dest) {
  const link = path.join(dest, 'shoplite', 'node_modules');
  let stat;
  try {
    stat = fs.lstatSync(link);
  } catch {
    return; // nothing there
  }
  if (!stat.isSymbolicLink()) return; // real directory — leave it to git
  try {
    fs.unlinkSync(link);
  } catch {
    // Some Windows setups require rmdir for junctions (non-recursive: removes the link only)
    fs.rmdirSync(link);
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
