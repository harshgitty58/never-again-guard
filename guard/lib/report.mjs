/**
 * report.mjs — write incident and summary reports to reports/.
 */
import fs from 'fs';
import path from 'path';

/**
 * Write a single incident report to reports/<incident>.json.
 *
 * @param {Object} report - the full report object
 * @param {string} reportsDir - absolute path to the reports directory
 */
export function writeReport(report, reportsDir) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const file = path.join(reportsDir, `${report.incident}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  return file;
}

/**
 * Write a summary.json aggregating all incident reports.
 *
 * @param {Object[]} reports - array of incident report objects
 * @param {string} reportsDir - absolute path to the reports directory
 */
export function writeSummary(reports, reportsDir) {
  const summary = {
    generatedAt: new Date().toISOString(),
    incidents: reports.map((r) => ({
      incident: r.incident,
      title: r.title,
      verdict: r.verdict,
      variantsOpen: (r.rule?.variants ?? []).filter((v) => v.status === 'open').length,
      actionItemsGuarded: (r.actionItems ?? []).filter((a) => a.status === 'guarded').length,
      actionItemsTotal: (r.actionItems ?? []).length,
    })),
    totalVariantsOpen: reports.reduce(
      (n, r) => n + (r.rule?.variants ?? []).filter((v) => v.status === 'open').length,
      0
    ),
    allGuarded: reports.every((r) => r.verdict === 'GUARDED'),
  };

  const file = path.join(reportsDir, 'summary.json');
  fs.writeFileSync(file, JSON.stringify(summary, null, 2), 'utf8');
  return file;
}
