import { useState } from 'react';
import { blob, fmtMs, REPO, type Dataset, type Incident, type ItemStatus, type Verdict } from './data';

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function VerdictChip({ verdict }: { verdict: Verdict }) {
  const v = verdict.toLowerCase();
  return (
    <span className={`status status-lg s-${v}`}>
      <i aria-hidden />
      {cap(v)}
    </span>
  );
}

function StatusChip({ status }: { status: ItemStatus | 'open' | 'fixed' }) {
  return (
    <span className={`status s-${status}`}>
      <i aria-hidden />
      {cap(status)}
    </span>
  );
}

function Check({ ok, children }: { ok: boolean | undefined; children: React.ReactNode }) {
  return (
    <li className={ok ? 'check ok' : 'check bad'}>
      <span aria-hidden>{ok ? '✓' : '✗'}</span> {children}
    </li>
  );
}

function SectionHead({ index, kicker, title, children }: { index: string; kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow"><span className="eyebrow-n">{index}</span>{kicker}</p>
        <h2>{title}</h2>
      </div>
      {children && <p className="section-sub">{children}</p>}
    </div>
  );
}

/* ── Proof strip ──────────────────────────────────────────────────────── */

export function ProofSection({ data }: { data: Dataset }) {
  return (
    <section id="proof" className="section">
      <SectionHead index="01" kicker="Proof" title="Proof, per incident">
        The verifier checks out the bug commit and the fix commit in throwaway git worktrees and runs the
        same regression test in both. A guard only counts if it fails on an assertion at the bug and passes at the fix.
      </SectionHead>
      <div className="stack">
        {data.incidents.map((inc) => (
          <ProofCard key={inc.id} inc={inc} />
        ))}
      </div>
    </section>
  );
}

function ProofCard({ inc }: { inc: Incident }) {
  const r = inc.current;
  const bug = r.proof.bug;
  const fix = r.proof.fix;
  const tag = inc.id.toLowerCase();
  const bugOk = bug && bug.exit !== 0 && bug.failedOn === 'assertion';
  const fixOk = fix && fix.exit === 0;
  const variantsBefore = inc.before.rule.variants?.length ?? 0;
  const variantsNow = r.rule.variants?.length ?? 0;

  return (
    <article className="card incident" id={inc.id}>
      <header className="incident-head">
        <div>
          <span className="mono muted">{inc.id}</span>
          <h3>{inc.title}</h3>
        </div>
        <div className="incident-meta">
          <VerdictChip verdict={r.verdict} />
          <a href={`${REPO}/tree/main/guards/${inc.id}`} target="_blank" rel="noreferrer">guard files ↗</a>
        </div>
      </header>

      <div className="proof-strip">
        <div className={`terminal ${bugOk ? 'is-red' : 'is-warn'}`}>
          <div className="terminal-bar">
            <span className="dots" aria-hidden><i /><i /><i /></span>
            <span className="mono">@ {tag}-bug</span>
            <span className="terminal-expect">expect FAIL</span>
          </div>
          <pre className="terminal-body">
            <span className="muted">$ vitest run regression.test.js</span>{'\n'}
            <span className="t-red">✗ FAIL</span>  <span className="muted">failedOn:</span> {bug?.failedOn ?? '—'}{'\n'}
            <span className="excerpt">  {bug?.excerpt || '(no excerpt)'}</span>{'\n'}
            <span className="muted">exit {bug?.exit ?? '—'} · {fmtMs(bug?.ms)}</span>
          </pre>
        </div>
        <div className={`terminal ${fixOk ? 'is-green' : 'is-warn'}`}>
          <div className="terminal-bar">
            <span className="dots" aria-hidden><i /><i /><i /></span>
            <span className="mono">@ {tag}-fix</span>
            <span className="terminal-expect">expect PASS</span>
          </div>
          <pre className="terminal-body">
            <span className="muted">$ vitest run regression.test.js</span>{'\n'}
            <span className="t-green">✓ PASS</span>  <span className="muted">all assertions hold</span>{'\n'}
            {'\n'}
            <span className="muted">exit {fix?.exit ?? '—'} · {fmtMs(fix?.ms)}</span>
          </pre>
        </div>
      </div>

      <div className="incident-checks">
        <ul>
          <Check ok={r.anticheat.passed}>anti-cheat: {(r.anticheat.checks ?? []).join(' · ')}</Check>
          <Check ok={r.rule.seedMatchedOnBug}>{r.rule.engine ?? 'rule'} matches the seed at the bug commit</Check>
          <Check ok={r.rule.seedCleanOnFix}>seed is clean at the fix commit</Check>
          <Check ok={variantsNow === 0}>
            variants open: {variantsNow} <span className="muted">(run-1 found {variantsBefore})</span>
          </Check>
        </ul>
        <span className="mono muted small">verified in {fmtMs(r.timings.totalMs)} · reports/{inc.id}.json</span>
      </div>
    </article>
  );
}

/* ── Variant map ──────────────────────────────────────────────────────── */

export function VariantMap({ data }: { data: Dataset }) {
  const [run, setRun] = useState<1 | 2>(1);
  const rows = data.incidents.flatMap((i) => i.variants);
  const commit = run === 1 ? data.run1Commit : data.run2Commit;

  return (
    <section id="variants" className="section">
      <SectionHead index="02" kicker="Variants" title="Variant map">
        Each incident's root cause is turned into a Semgrep rule and run across the whole app. Run 1 found every other
        file with the same bug. Bob fixed them, and run 2 proves they're closed.
      </SectionHead>

      <div className="card table-card">
        <div className="table-toolbar">
          <div className="segmented" role="tablist" aria-label="Verifier run">
            <button role="tab" aria-selected={run === 1} className={run === 1 ? 'on' : ''} onClick={() => setRun(1)}>
              Run 1 · before
            </button>
            <button role="tab" aria-selected={run === 2} className={run === 2 ? 'on' : ''} onClick={() => setRun(2)}>
              Run 2 · after fixes
            </button>
          </div>
          <span className="mono muted small">
            {run === 1 ? rows.length : rows.filter((v) => !v.fixed).length} open
            {commit && ` · commit ${commit}`}
          </span>
        </div>

        <div className="table-wrap">
          <table className="variants">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Location</th>
                <th>Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => {
                const open = run === 1 || !v.fixed;
                const after = v.code?.after;
                const line = run === 2 && v.fixed && after ? after.line : v.line;
                const code = run === 1 ? v.code?.before : after?.code ?? v.code?.before;
                const file = v.file.replace(/^shoplite\/src\//, '');
                return (
                  <tr key={`${v.file}:${v.line}`}>
                    <td className="mono">{v.incident}</td>
                    <td className="mono">
                      <a href={commit ? `${REPO}/blob/${commit}/${v.file}#L${line}` : blob(v.file)} target="_blank" rel="noreferrer">
                        {file}:{line}
                      </a>
                    </td>
                    <td>
                      <pre className={`code ${open ? 'code-bad' : 'code-good'}`}>{code ?? v.snippet}</pre>
                    </td>
                    <td><StatusChip status={open ? 'open' : 'fixed'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ── Action-item audit ────────────────────────────────────────────────── */

const STATUSES: ItemStatus[] = ['guarded', 'partial', 'unguarded', 'process-only'];

export function ActionAudit({ data }: { data: Dataset }) {
  const all = data.incidents.flatMap((i) => i.current.actionItems);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((a) => a.status === s).length]));

  return (
    <section id="audit" className="section">
      <SectionHead index="03" kicker="Audit" title="Action-item audit">
        Every action item in the postmortem is classified with file evidence. Runbook and on-call changes are marked
        process-only. We don't make up code evidence for them.
      </SectionHead>

      <div className="audit-totals">
        {STATUSES.map((s) => (
          <div key={s} className="audit-total">
            <span className={`audit-count t-${s}`}>{counts[s]}</span>
            <StatusChip status={s} />
          </div>
        ))}
      </div>

      <div className="stack">
        {data.incidents.map((inc) => {
          const before = new Map(inc.before.actionItems.map((a) => [a.id, a.status]));
          return (
            <div key={inc.id} className="card audit-card">
              <h3 className="audit-title">
                <span className="mono muted">{inc.id}</span> {inc.title}
              </h3>
              <ul className="audit-list">
                {inc.current.actionItems.map((a) => {
                  const was = before.get(a.id);
                  return (
                    <li key={a.id} className="audit-row">
                      <span className="mono muted">{a.id}</span>
                      <div className="audit-text">
                        <p>{a.text}</p>
                        {a.evidence.length > 0 && (
                          <p className="evidence">
                            {a.evidence.map((e) => (
                              <a key={e} className="mono" href={blob(e)} target="_blank" rel="noreferrer">{e}</a>
                            ))}
                          </p>
                        )}
                      </div>
                      <span className="type-tag mono">{a.type}</span>
                      <span className="audit-status">
                        {was && was !== a.status && (
                          <>
                            <StatusChip status={was} />
                            <span className="muted" aria-label="became">→</span>
                          </>
                        )}
                        <StatusChip status={a.status} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── How it works ─────────────────────────────────────────────────────── */

const STEPS = [
  { n: '01', title: 'Postmortem', body: 'A normal incident write-up: root cause, trigger, seed file, action items.', bob: 'Document understanding' },
  { n: '02', title: 'Bob reads', body: 'Guided by the never-again skill and project rules, Bob pulls out the root cause, seed location and bug/fix refs.', bob: 'Agent mode · Skill' },
  { n: '03', title: 'Guard generated', body: 'For each incident, Bob writes a regression test, a Semgrep rule and a guard.json manifest.', bob: 'Agent mode' },
  { n: '04', title: 'Verifier proves', body: 'Deterministic, no AI: worktrees at both commits, anti-cheat, rule sanity checks, variant hunt.', bob: 'The judge' },
  { n: '05', title: 'Variants fixed', body: 'Bob fixes every variant the rules found, then the verifier reruns until nothing is open.', bob: 'Agent mode' },
];

export function HowItWorks() {
  return (
    <section id="how" className="section">
      <SectionHead index="04" kicker="Pipeline" title="How it works">
        Bob generates the guard. The verifier, which has no AI in it, decides whether it counts.
      </SectionHead>
      <ol className="flow">
        {STEPS.map((s) => (
          <li key={s.n} className={`flow-step${s.n === '04' ? ' is-judge' : ''}`}>
            <span className="flow-n mono">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <span className="bob-tag">{s.bob}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Run it yourself ──────────────────────────────────────────────────── */

const COMMANDS = [
  { label: 'Clone and install the demo app', cmd: `git clone ${REPO}.git\ncd never-again-guard\nnpm install --prefix shoplite\npip install semgrep` },
  { label: 'Run the verifier (exit 0 only if every incident is GUARDED)', cmd: 'npm run guard -- --all' },
  { label: 'View the dashboard locally', cmd: 'npm run sync-reports\ncd dashboard && npm install && npm run dev' },
];

function CopyBlock({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-block">
      <pre className="mono">{cmd}</pre>
      <button
        className="btn btn-ghost"
        onClick={() => {
          navigator.clipboard?.writeText(cmd).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          });
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function RunIt({ data }: { data: Dataset }) {
  return (
    <section id="run" className="section">
      <SectionHead index="05" kicker="Reproduce" title="Run it yourself">
        Every number on this page comes from the verifier. Clone the repo and get the same result.
      </SectionHead>
      <div className="stack">
        {COMMANDS.map((c) => (
          <div key={c.label}>
            <p className="copy-label">{c.label}</p>
            <CopyBlock cmd={c.cmd} />
          </div>
        ))}
      </div>
      <footer className="footer">
        <span>Built with IBM Bob 2.0 · MIT</span>
        <span className="mono muted">reports generated {new Date(data.generatedAt).toLocaleString()}</span>
        <a href={REPO} target="_blank" rel="noreferrer">GitHub ↗</a>
      </footer>
    </section>
  );
}
