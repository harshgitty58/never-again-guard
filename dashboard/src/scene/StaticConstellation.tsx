import { isDone, type SceneIncident } from './model';

const POS: [number, number][] = [
  [300, 120],
  [170, 320],
  [430, 320],
];
const RED = '#FF4D5E';
const GREEN = '#2BD99F';

function hexagon(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

/** SVG stand-in for the 3D scene: reduced motion, no WebGL, or while the canvas loads. */
export default function StaticConstellation({
  incidents,
  step,
  onSelect,
}: {
  incidents: SceneIncident[];
  step: number;
  onSelect?: (id: string) => void;
}) {
  return (
    <svg className="static-constellation" viewBox="0 0 600 440" role="img" aria-label="Incident constellation">
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {incidents.map((inc, i) => {
        const [cx, cy] = POS[i % POS.length];
        const done = isDone(inc, step);
        const color = done ? inc.afterColor : inc.beforeColor;
        return (
          <g key={inc.id} className="sc-node" onClick={() => onSelect?.(inc.id)}>
            <circle cx={cx} cy={cy} r={92} fill="none" stroke={inc.afterColor}
              strokeOpacity={done && inc.guarded ? 0.55 : 0} strokeWidth={1.5} className="sc-fade" />
            <circle cx={cx} cy={cy} r={60} fill="url(#glow)" opacity={0.25} />
            <polygon points={hexagon(cx, cy, 38)} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} className="sc-fade" />
            <polygon points={hexagon(cx, cy, 18)} fill={color} className="sc-fade" />
            {inc.variants.map((fixed, j) => {
              const a = (j / inc.variants.length) * Math.PI * 2 - Math.PI / 4;
              const flipped = fixed && step > inc.offset + j;
              const x = cx + Math.cos(a) * 66;
              const y = cy + Math.sin(a) * 66;
              return (
                <rect key={j} x={x - 5} y={y - 5} width={10} height={10} transform={`rotate(45 ${x} ${y})`}
                  fill={flipped ? GREEN : RED} className="sc-fade" />
              );
            })}
            <text x={cx} y={cy + 118} textAnchor="middle" className="sc-label">{inc.id}</text>
          </g>
        );
      })}
    </svg>
  );
}
