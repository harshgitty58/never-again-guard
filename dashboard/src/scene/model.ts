/** Shared between the lazy 3D scene and the eager hero/fallback — keep three.js out of here. */
export interface SceneIncident {
  id: string;
  title: string;
  beforeColor: string;
  afterColor: string;
  beforeVerdict: string;
  afterVerdict: string;
  guarded: boolean;
  /** Real outcome per variant: true = fixed in the latest run. */
  variants: boolean[];
  /** Index of this incident's first variant in the global replay order. */
  offset: number;
}

/** An incident flips to its latest verdict once every one of its variants has been replayed. */
export function isDone(inc: SceneIncident, step: number) {
  return step > 0 && step >= inc.offset + inc.variants.length;
}
