/** Types + loader for verifier output synced into public/reports/. */

export type Verdict = 'GUARDED' | 'PARTIAL' | 'FAILED';
export type ItemStatus = 'guarded' | 'partial' | 'unguarded' | 'process-only';

export interface Variant {
  file: string;
  line: number;
  snippet: string;
  status: string;
}

export interface ActionItem {
  id: string;
  text: string;
  type: 'test' | 'rule' | 'code' | 'process';
  status: ItemStatus;
  evidence: string[];
}

export interface Report {
  incident: string;
  title: string;
  verdict: Verdict;
  proof: {
    bug?: { exit: number; failedOn: string | null; ms: number; excerpt: string };
    fix?: { exit: number; ms: number };
  };
  rule: {
    engine?: string;
    seedMatchedOnBug?: boolean;
    seedCleanOnFix?: boolean;
    variants?: Variant[];
    engineError?: string | null;
  };
  actionItems: ActionItem[];
  anticheat: { passed?: boolean; checks?: string[]; violations?: string[] };
  timings: { totalMs?: number };
  generatedAt: string;
}

export interface Snippet {
  before: string;
  after: { line: number; code: string } | null;
}

/** A variant found in run-1, with its status after the latest run. */
export interface TrackedVariant extends Variant {
  incident: string;
  fixed: boolean;
  code?: Snippet;
}

export interface Incident {
  id: string;
  title: string;
  current: Report;
  before: Report;
  variants: TrackedVariant[];
}

export interface Dataset {
  incidents: Incident[];
  generatedAt: string;
  run1Commit?: string;
  run2Commit?: string;
}

export const REPO = 'https://github.com/harshgitty58/never-again-guard';
export const blob = (p: string) => `${REPO}/blob/main/${p}`;

const base = `${import.meta.env.BASE_URL}reports/`;

async function getJson<T>(p: string): Promise<T | null> {
  try {
    const res = await fetch(base + p, { cache: 'no-cache' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function loadDataset(): Promise<Dataset> {
  const summary = await getJson<{ generatedAt: string; incidents: { incident: string }[] }>('summary.json');
  if (!summary) throw new Error('reports/summary.json not found — run `npm run sync-reports` from the repo root.');

  const snippets = await getJson<{ run1Commit: string; run2Commit: string; variants: Record<string, Snippet> }>(
    'snippets.json',
  );

  const incidents = await Promise.all(
    summary.incidents.map(async ({ incident }) => {
      const current = await getJson<Report>(`${incident}.json`);
      if (!current) throw new Error(`reports/${incident}.json missing`);
      const before = (await getJson<Report>(`history/run-1/${incident}.json`)) ?? current;

      const openNow = new Set((current.rule.variants ?? []).map((v) => `${v.file}:${v.line}`));
      const seen = new Set<string>();
      const variants: TrackedVariant[] = [];
      for (const v of [...(before.rule.variants ?? []), ...(current.rule.variants ?? [])]) {
        const key = `${v.file}:${v.line}`;
        if (seen.has(key)) continue;
        seen.add(key);
        variants.push({ ...v, incident, fixed: !openNow.has(key), code: snippets?.variants[key] });
      }
      return { id: incident, title: current.title, current, before, variants };
    }),
  );

  return {
    incidents,
    generatedAt: summary.generatedAt,
    run1Commit: snippets?.run1Commit,
    run2Commit: snippets?.run2Commit,
  };
}

export const verdictColor: Record<Verdict, string> = {
  GUARDED: '#2BD99F',
  PARTIAL: '#FFB547',
  FAILED: '#FF4D5E',
};

export function fmtMs(ms?: number) {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}
