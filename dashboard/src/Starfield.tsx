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

/**
 * Fixed night-sky backdrop for the whole page, matching the hero's 3D stars.
 * Drawn once per resize on a 2D canvas — no animation loop, so scrolling stays cheap.
 */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Faint nebula glows
      const glows: [number, number, number, string][] = [
        [0.82, 0.18, 0.55, 'rgba(69, 137, 255, 0.05)'],
        [0.12, 0.72, 0.5, 'rgba(43, 217, 159, 0.035)'],
        [0.55, 1.05, 0.6, 'rgba(69, 137, 255, 0.035)'],
      ];
      for (const [gx, gy, gr, color] of glows) {
        const r = Math.max(w, h) * gr;
        const g = ctx.createRadialGradient(gx * w, gy * h, 0, gx * w, gy * h, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      const rand = mulberry32(20260927);
      const count = Math.round((w * h) / 2600);
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const size = rand();
        const r = size < 0.85 ? 0.35 + size * 0.5 : 0.8 + (size - 0.85) * 5;
        const a = 0.18 + rand() * 0.62;
        const tint = rand();
        const rgb = tint < 0.1 ? '120, 165, 255' : tint < 0.13 ? '120, 240, 200' : '235, 238, 245';
        if (r > 1.1) {
          const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
          halo.addColorStop(0, `rgba(${rgb}, ${a * 0.35})`);
          halo.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = halo;
          ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
        }
        ctx.fillStyle = `rgba(${rgb}, ${a})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    let t: number | undefined;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(draw, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(t);
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden />;
}
