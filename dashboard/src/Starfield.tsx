import { useEffect, useRef } from 'react';

/** Deterministic PRNG so a resize doesn't reshuffle the sky. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number; // field coords in [-0.5, 0.5]
  y: number;
  depth: number; // 0.3 (far) .. 1.4 (near)
  r: number;
  a: number;
  rgb: string;
  twinkle: number; // 0 = steady
  phase: number;
}

const ROTATION = 0.012; // rad/s — same slow drift as the hero's star sphere
const PARALLAX_POINTER = 14; // px at depth 1
const PARALLAX_SCROLL = 0.04; // of scroll distance, at depth 1

/**
 * Night-sky backdrop for the whole page, moving like the hero's 3D stars:
 * slow rotation, twinkle, and depth parallax on pointer + scroll.
 * Reduced motion → drawn once, static. Paused while the tab is hidden.
 */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let field = 0; // square field side, covers the viewport at any rotation
    let stars: Star[] = [];
    let glows: { x: number; y: number; r: number; color: string }[] = [];

    // Pre-rendered halo sprite for the few bright stars
    const halo = document.createElement('canvas');
    halo.width = halo.height = 32;
    const hctx = halo.getContext('2d')!;
    const hg = hctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    hg.addColorStop(0, 'rgba(255,255,255,0.55)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    hctx.fillStyle = hg;
    hctx.fillRect(0, 0, 32, 32);

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      field = Math.hypot(w, h) * 1.08;

      const rand = mulberry32(20260927);
      const count = Math.round((field * field) / 3400);
      stars = Array.from({ length: count }, () => {
        const size = rand();
        const tint = rand();
        return {
          x: rand() - 0.5,
          y: rand() - 0.5,
          depth: 0.3 + rand() * 1.1,
          r: size < 0.86 ? 0.35 + size * 0.5 : 0.8 + (size - 0.86) * 5,
          a: 0.18 + rand() * 0.62,
          rgb: tint < 0.1 ? '120,165,255' : tint < 0.13 ? '120,240,200' : '235,238,245',
          twinkle: rand() < 0.45 ? 0.5 + rand() * 1.8 : 0,
          phase: rand() * Math.PI * 2,
        };
      });
      glows = [
        { x: 0.82 * w, y: 0.18 * h, r: Math.max(w, h) * 0.55, color: 'rgba(69,137,255,0.05)' },
        { x: 0.12 * w, y: 0.72 * h, r: Math.max(w, h) * 0.5, color: 'rgba(43,217,159,0.035)' },
        { x: 0.55 * w, y: 1.05 * h, r: Math.max(w, h) * 0.6, color: 'rgba(69,137,255,0.035)' },
      ];
    };

    // Smoothed pointer parallax
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / w - 0.5) * 2;
      pointer.ty = (e.clientY / h - 0.5) * 2;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const g of glows) {
        const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        grad.addColorStop(0, g.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const scroll = window.scrollY;
      const cx = w / 2;
      const cy = h / 2;

      for (const s of stars) {
        // scroll parallax wraps inside the field so stars never run out
        let fy = s.y - (scroll * PARALLAX_SCROLL * s.depth) / field;
        fy -= Math.round(fy);
        const px = s.x * field;
        const py = fy * field;
        const ang = t * ROTATION * (0.75 + s.depth * 0.25);
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const x = cx + px * cos - py * sin - pointer.x * PARALLAX_POINTER * s.depth;
        const y = cy + px * sin + py * cos - pointer.y * PARALLAX_POINTER * s.depth;
        if (x < -8 || y < -8 || x > w + 8 || y > h + 8) continue;

        const a = s.twinkle ? s.a * (0.62 + 0.38 * Math.sin(t * s.twinkle + s.phase)) : s.a;
        if (s.r > 1.1) {
          const hr = s.r * 5;
          ctx.globalAlpha = a * 0.6;
          ctx.drawImage(halo, x - hr, y - hr, hr * 2, hr * 2);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${s.rgb},${a})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    setup();
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (reduced) draw(0);
      else if (!document.hidden) raf = requestAnimationFrame(loop);
    };

    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setup();
        if (reduced) draw(0);
      }, 150);
    };

    run();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', run);
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden />;
}
