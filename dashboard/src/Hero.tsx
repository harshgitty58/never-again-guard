import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { verdictColor, type Dataset } from './data';
import StaticConstellation from './scene/StaticConstellation';
import { isDone, type SceneIncident } from './scene/model';

const Scene = lazy(() => import('./scene/Scene'));

const STEP_MS = 450;
const AUTOPLAY_DELAY_MS = 1400;
/** `?autoplay=0` holds the run-1 state until Replay is clicked (for demos and recordings). */
const AUTOPLAY = new URLSearchParams(window.location.search).get('autoplay') !== '0';

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export default function Hero({ data }: { data: Dataset }) {
  const reduced = usePrefersReducedMotion();
  const webgl = useMemo(supportsWebGL, []);
  const use3D = webgl && !reduced;

  const sceneIncidents = useMemo<SceneIncident[]>(() => {
    let offset = 0;
    return data.incidents.map((inc) => {
      const s: SceneIncident = {
        id: inc.id,
        title: inc.title,
        beforeColor: verdictColor[inc.before.verdict],
        afterColor: verdictColor[inc.current.verdict],
        beforeVerdict: inc.before.verdict,
        afterVerdict: inc.current.verdict,
        guarded: inc.current.verdict === 'GUARDED',
        variants: inc.variants.map((v) => v.fixed),
        offset,
      };
      offset += inc.variants.length;
      return s;
    });
  }, [data]);

  const totalVariants = sceneIncidents.reduce((n, i) => n + i.variants.length, 0);
  const lastStep = Math.max(totalVariants, 1);
  const [step, setStep] = useState(reduced ? lastStep : 0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const replay = useCallback(() => {
    window.clearInterval(timer.current);
    if (reduced) {
      setStep(lastStep);
      return;
    }
    setStep(0);
    setPlaying(true);
    let s = 0;
    timer.current = window.setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= lastStep) {
        window.clearInterval(timer.current);
        setPlaying(false);
      }
    }, STEP_MS);
  }, [lastStep, reduced]);

  useEffect(() => {
    if (reduced || !AUTOPLAY) return;
    const t = window.setTimeout(replay, AUTOPLAY_DELAY_MS);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(timer.current);
    };
  }, [replay, reduced]);

  // Pause the render loop when the hero scrolls out of view.
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!section.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(section.current);
    return () => io.disconnect();
  }, []);

  const onSelect = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [reduced]);

  const openNow = sceneIncidents.reduce(
    (n, inc) => n + inc.variants.filter((fixed, j) => !(fixed && step > inc.offset + j)).length,
    0,
  );
  const guardedNow = sceneIncidents.filter((inc) => isDone(inc, step) && inc.guarded).length;
  // Action items follow the replay: run-1 audit until each incident flips, then the latest.
  const items = data.incidents.flatMap((inc, i) =>
    isDone(sceneIncidents[i], step) ? inc.current.actionItems : inc.before.actionItems,
  );
  const codeItems = items.filter((a) => a.status !== 'process-only');
  const withEvidence = codeItems.filter((a) => a.status === 'guarded').length;
  const processOnly = items.length - codeItems.length;
  const finished = step >= lastStep;
  const allGuarded = sceneIncidents.every((i) => i.guarded);

  return (
    <header className="hero" ref={section}>
      <div className="hero-canvas" aria-hidden={use3D}>
        {use3D ? (
          <Suspense fallback={<div className="hero-static"><StaticConstellation incidents={sceneIncidents} step={step} /></div>}>
            <Scene incidents={sceneIncidents} step={step} active={visible} onSelect={onSelect} />
          </Suspense>
        ) : (
          <div className="hero-static">
            <StaticConstellation incidents={sceneIncidents} step={step} onSelect={onSelect} />
          </div>
        )}
      </div>

      <nav className="topbar">
        <span className="brand">
          <img src="/favicon.svg" alt="" width={22} height={22} /> Never Again
        </span>
        <span className="topbar-links">
          <a href="#proof">Proof</a>
          <a href="#variants">Variants</a>
          <a href="#audit">Audit</a>
          <a href="#how">How it works</a>
          <a className="gh" href="https://github.com/harshgitty58/never-again-guard" target="_blank" rel="noreferrer">GitHub</a>
        </span>
      </nav>

      <div className="hero-copy">
        <p className="hero-badge">
          <span className="hero-badge-dot" aria-hidden />
          Postmortem → Regression Guard
          <span className="hero-badge-sep" aria-hidden />
          <span className="muted">Built with IBM Bob 2.0</span>
        </p>
        <h1>Every postmortem becomes a guard your code can't forget.</h1>
        <p className="lede">
          Bob reads the postmortem and generates a regression test, a variant rule and an action-item audit.
          A deterministic verifier then proves the test <em className="t-red">fails on the bug</em> and{' '}
          <em className="t-green">passes on the fix</em>. The AI never grades its own homework.
        </p>

        <div className="kpis">
          <div className="kpi">
            <span className="kpi-value">{guardedNow}<small>/{sceneIncidents.length}</small></span>
            <span className="kpi-label">incidents guarded</span>
          </div>
          <div className="kpi">
            <span className="kpi-value" style={{ color: openNow ? '#FF4D5E' : '#2BD99F' }}>
              {openNow}
              <small> open</small>
            </span>
            <span className="kpi-label">variants · {totalVariants} found by the rules</span>
          </div>
          <div className="kpi">
            <span className="kpi-value">{withEvidence}<small>/{codeItems.length}</small></span>
            <span className="kpi-label">action items with code evidence · {processOnly} process-only</span>
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={replay} disabled={playing}>
            {playing ? 'Verifying…' : 'Replay verification'}
          </button>
          <span className="replay-status mono" aria-live="polite">
            {step === 0 && 'run-1 · rules found variants'}
            {step > 0 && !finished && `fixing variant ${step}/${totalVariants}`}
            {finished && `run-2 · ${totalVariants} → ${openNow} open · verifier exit ${allGuarded ? 0 : 1}`}
          </span>
        </div>
      </div>
      <a className="scroll-cue" href="#proof" aria-label="Scroll to proof">↓</a>
    </header>
  );
}
