#!/usr/bin/env node
/**
 * verify.mjs — Never Again verifier CLI
 *
 * Usage:
 *   node guard/verify.mjs INC-101
 *   node guard/verify.mjs --all
 *   node guard/verify.mjs INC-101 INC-102
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorktree, removeWorktree, getRepoRoot } from './lib/git.mjs';
import { anticheat } from './lib/anticheat.mjs';
import { copyTestToWorktree, runTest } from './lib/run-test.mjs';
import { runRule } from './lib/run-rule.mjs';
import { writeReport, writeSummary } from './lib/report.mjs';

// ── Colours ────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};
const ok = (s) => `${C.green}${s}${C.reset}`;
const fail = (s) => `${C.red}${s}${C.reset}`;
const warn = (s) => `${C.yellow}${s}${C.reset}`;
const muted = (s) => `${C.gray}${s}${C.reset}`;
const bold = (s) => `${C.bold}${s}${C.reset}`;

// ── Helpers ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = getRepoRoot();
const GUARDS_DIR = path.join(REPO_ROOT, 'guards');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

function loadGuard(incident) {
  const guardFile = path.join(GUARDS_DIR, incident, 'guard.json');
  if (!fs.existsSync(guardFile)) {
    throw new Error(`No guard.json found at ${guardFile}`);
  }
  return JSON.parse(fs.readFileSync(guardFile, 'utf8'));
}

function discoverIncidents() {
  if (!fs.existsSync(GUARDS_DIR)) return [];
  return fs.readdirSync(GUARDS_DIR).filter((d) => {
    const p = path.join(GUARDS_DIR, d, 'guard.json');
    return fs.existsSync(p);
  }).sort();
}

// ── Per-incident verifier ──────────────────────────────────────────────────
async function verifyIncident(incident) {
  console.log(`\n${bold(`── ${incident} ──────────────────────────────────────────`)}`);
  const guard = loadGuard(incident);

  const bugWorktree = path.join(REPO_ROOT, '.guard-tmp', `${incident}-bug`);
  const fixWorktree = path.join(REPO_ROOT, '.guard-tmp', `${incident}-fix`);
  const testAbsPath = path.resolve(REPO_ROOT, guard.test);
  const testFile = path.basename(testAbsPath);

  const report = {
    incident: guard.incident,
    title: guard.title,
    verdict: 'FAILED',
    proof: {},
    rule: {},
    actionItems: guard.actionItems ?? [],
    anticheat: {},
    timings: {},
    generatedAt: new Date().toISOString(),
  };

  const totalStart = Date.now();

  try {
    // ── Step 1: Anti-cheat ────────────────────────────────────────────────
    process.stdout.write('  Anti-cheat … ');
    const ac = anticheat(testAbsPath);
    report.anticheat = { passed: ac.passed, checks: ac.checks, violations: ac.violations };
    if (!ac.passed) {
      console.log(fail(`FAILED: ${ac.violations.join('; ')}`));
      report.verdict = 'FAILED';
      report.timings.totalMs = Date.now() - totalStart;
      return report;
    }
    console.log(ok('passed'));

    // ── Step 2: Bug proof ────────────────────────────────────────────────
    process.stdout.write(`  Bug proof  (${guard.bugRef}) … `);
    createWorktree(bugWorktree, guard.bugRef, REPO_ROOT);
    copyTestToWorktree(testAbsPath, bugWorktree);
    const bugResult = runTest(testFile, bugWorktree);
    report.proof.bug = {
      exit: bugResult.exit,
      failedOn: bugResult.failedOn,
      ms: bugResult.ms,
      excerpt: bugResult.excerpt,
    };

    if (bugResult.exit === 0) {
      console.log(fail(`FAILED: test passed on bug commit (should fail)`));
      report.verdict = 'FAILED';
      report.timings.totalMs = Date.now() - totalStart;
      return report;
    }
    if (bugResult.failedOn !== 'assertion') {
      console.log(fail(`FAILED: test failed but not on assertion (${bugResult.failedOn}): ${bugResult.excerpt.slice(0, 80)}`));
      report.verdict = 'FAILED';
      report.timings.totalMs = Date.now() - totalStart;
      return report;
    }
    console.log(ok(`✗ (assertion)`) + muted(`  ${bugResult.excerpt.slice(0, 60)}`));

    // ── Step 3: Fix proof ────────────────────────────────────────────────
    process.stdout.write(`  Fix proof  (${guard.fixRef}) … `);
    createWorktree(fixWorktree, guard.fixRef, REPO_ROOT);
    copyTestToWorktree(testAbsPath, fixWorktree);
    const fixResult = runTest(testFile, fixWorktree);
    report.proof.fix = { exit: fixResult.exit, ms: fixResult.ms };

    if (fixResult.exit !== 0) {
      console.log(fail(`FAILED: test failed on fix commit (should pass): ${fixResult.excerpt.slice(0, 80)}`));
      report.verdict = 'FAILED';
      report.timings.totalMs = Date.now() - totalStart;
      return report;
    }
    console.log(ok('✓ passed'));

    // ── Step 4: Rule sanity ───────────────────────────────────────────────
    let ruleResult = { seedMatchedOnBug: null, seedCleanOnFix: null, variants: [] };
    if (guard.rule) {
      const seed = guard.rule.seed;
      const seedFile = path.normalize(seed.file);

      // Bug worktree scan
      process.stdout.write('  Rule / bug worktree … ');
      const bugScan = runRule(
        guard.rule,
        path.join(bugWorktree, path.dirname(seedFile)),
        bugWorktree
      );
      const bugSeedMatch = bugScan.matches.some(
        (m) => path.normalize(m.file).endsWith(path.normalize(seedFile)) &&
          Math.abs(m.line - seed.line) <= 2
      );
      ruleResult.seedMatchedOnBug = bugSeedMatch;
      if (bugSeedMatch) {
        console.log(ok('seed matched'));
      } else if (bugScan.error) {
        console.log(warn(`skipped (engine error: ${bugScan.error.slice(0, 60)})`));
        ruleResult.seedMatchedOnBug = null; // unknown
      } else {
        console.log(warn(`seed NOT matched (line ${seed.line} in ${seedFile})`));
        ruleResult.seedMatchedOnBug = false;
      }

      // Fix worktree scan
      process.stdout.write('  Rule / fix worktree … ');
      const fixScan = runRule(
        guard.rule,
        path.join(fixWorktree, path.dirname(seedFile)),
        fixWorktree
      );
      const fixSeedMatch = fixScan.matches.some(
        (m) => path.normalize(m.file).endsWith(path.normalize(seedFile)) &&
          Math.abs(m.line - seed.line) <= 2
      );
      ruleResult.seedCleanOnFix = !fixSeedMatch;
      if (!fixSeedMatch) {
        console.log(ok('seed clean'));
      } else if (fixScan.error) {
        console.log(warn(`skipped (engine error: ${fixScan.error.slice(0, 60)})`));
        ruleResult.seedCleanOnFix = null;
      } else {
        console.log(warn('seed still matched on fix worktree'));
        ruleResult.seedCleanOnFix = false;
      }

      // ── Step 5: Variant hunt (on HEAD src) ────────────────────────────
      process.stdout.write('  Variant hunt (HEAD) … ');
      const headScanPath = path.join(REPO_ROOT, 'shoplite', 'src');
      const headScan = runRule(guard.rule, headScanPath, REPO_ROOT);
      if (headScan.error) {
        console.log(warn(`skipped (${headScan.error.slice(0, 60)})`));
      } else {
        // Exclude the seed (it's been fixed in HEAD), mark others as open
        const variants = headScan.matches
          .filter((m) => {
            const normFile = path.normalize(m.file);
            const normSeed = path.normalize(path.join(REPO_ROOT, seedFile));
            return !normFile.endsWith(path.normalize(seedFile));
          })
          .map((m) => ({
            file: path.relative(REPO_ROOT, m.file).replace(/\\/g, '/'),
            line: m.line,
            snippet: m.snippet,
            status: 'open',
          }));
        ruleResult.variants = variants;
        if (variants.length === 0) {
          console.log(ok('0 open variants'));
        } else {
          console.log(warn(`${variants.length} open variant(s):`));
          for (const v of variants) {
            console.log(muted(`    ${v.file}:${v.line}  ${v.snippet.slice(0, 60)}`));
          }
        }
      }
    } else {
      console.log(muted('  Rule: none defined'));
    }
    report.rule = { engine: guard.rule?.engine ?? 'none', ...ruleResult };

    // ── Step 6: Action items ──────────────────────────────────────────────
    process.stdout.write('  Action items … ');
    const actionItems = (guard.actionItems ?? []).map((ai) => {
      const evidencePaths = ai.evidence ?? [];
      const allExist = evidencePaths.every((ep) => fs.existsSync(path.resolve(REPO_ROOT, ep)));
      return {
        id: ai.id,
        text: ai.text,
        type: ai.type,
        status: allExist && evidencePaths.length > 0 ? ai.status : (ai.type === 'process' ? 'process-only' : 'unguarded'),
        evidence: evidencePaths,
      };
    });
    report.actionItems = actionItems;
    const guarded = actionItems.filter((a) => a.status === 'guarded').length;
    console.log(`${guarded}/${actionItems.length} guarded`);

    // ── Step 7: Verdict ────────────────────────────────────────────────────
    const openVariants = (ruleResult.variants ?? []).filter((v) => v.status === 'open').length;
    const unguardedCode = actionItems.some(
      (a) => a.type !== 'process' && a.status === 'unguarded'
    );
    const ruleOk = ruleResult.seedMatchedOnBug !== false && ruleResult.seedCleanOnFix !== false;

    if (ruleOk && openVariants === 0 && !unguardedCode) {
      report.verdict = 'GUARDED';
    } else if (ruleOk) {
      report.verdict = 'PARTIAL';
    } else {
      report.verdict = 'FAILED';
    }

    report.timings.totalMs = Date.now() - totalStart;

    // Terminal verdict line
    const verdictStr =
      report.verdict === 'GUARDED' ? ok('GUARDED') :
      report.verdict === 'PARTIAL' ? warn('PARTIAL') :
      fail('FAILED');

    console.log(
      `\n  ${bold(guard.incident)}  ` +
      `${report.proof.bug?.failedOn === 'assertion' ? ok('✗ bug (assertion)') : fail('✗ bug (NO assertion)')}  ` +
      `${report.proof.fix?.exit === 0 ? ok('✓ fix') : fail('✗ fix')}  ` +
      (guard.rule ? `rule ${ruleOk ? ok('✓') : warn('?')}  ` : '') +
      `variants ${openVariants > 0 ? warn(`${openVariants} open`) : ok('0 open')}  ` +
      `→ ${verdictStr}`
    );

  } finally {
    // ── Step 8: Cleanup ────────────────────────────────────────────────────
    for (const wt of [bugWorktree, fixWorktree]) {
      try { removeWorktree(wt, REPO_ROOT); } catch { /* best-effort */ }
    }
  }

  return report;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  let incidents;
  if (args.includes('--all') || args.length === 0) {
    incidents = discoverIncidents();
    if (incidents.length === 0) {
      console.error(fail('No guard.json files found in guards/. Run with a specific incident: node guard/verify.mjs INC-101'));
      process.exit(1);
    }
    console.log(`${bold('Never Again Verifier')} — running all incidents: ${incidents.join(', ')}`);
  } else {
    incidents = args.filter((a) => !a.startsWith('--'));
    console.log(`${bold('Never Again Verifier')} — running: ${incidents.join(', ')}`);
  }

  const reports = [];
  for (const incident of incidents) {
    try {
      const report = await verifyIncident(incident);
      reports.push(report);
      writeReport(report, REPORTS_DIR);
    } catch (err) {
      console.error(fail(`\n  ${incident}: verifier error — ${err.message}`));
      reports.push({ incident, verdict: 'FAILED', error: err.message });
    }
  }

  writeSummary(reports, REPORTS_DIR);

  // Final summary
  console.log(`\n${bold('══ Summary ══════════════════════════════════════════')}`);
  let allGuarded = true;
  for (const r of reports) {
    const v = r.verdict === 'GUARDED' ? ok('GUARDED ✓') : r.verdict === 'PARTIAL' ? warn('PARTIAL') : fail('FAILED ✗');
    console.log(`  ${r.incident.padEnd(10)} ${v}`);
    if (r.verdict !== 'GUARDED') allGuarded = false;
  }
  console.log('');
  if (allGuarded) {
    console.log(ok(`All incidents GUARDED. ✓`));
  } else {
    console.log(warn(`Not all incidents are GUARDED yet.`));
  }

  process.exit(allGuarded ? 0 : 1);
}

main().catch((err) => {
  console.error(fail(`Fatal: ${err.message}`));
  console.error(err.stack);
  process.exit(2);
});
