import * as THREE from "three";

import { Random } from "./random";

class uvContext {
  readonly kMaxV: number;
  readonly kWidth: number;
  constructor(resolution: number) {
    this.kMaxV = resolution - 1;
    this.kWidth = resolution * 2;
  }
}

class uvPair {
  constructor(public u: number, public v: number, private context: uvContext) {
    if (this.v === 0 || this.v === context.kMaxV) {
      this.u = 0;
    }
  }

  static mid(a: uvPair, b: uvPair): uvPair {
    if (a.v === 0 || a.v === a.context.kMaxV) {
      a.u = b.u;
    } else if (b.v === 0 || b.v === a.context.kMaxV) {
      b.u = a.u;
    }
    return new uvPair(
      Math.round((a.u + b.u) / 2), Math.round((a.v + b.v) / 2), a.context);
  }

  equals(other: uvPair) {
    if (this.v === 0 && other.v === 0) {
      return true;
    }
    if (this.v === this.context.kMaxV && other.v === this.context.kMaxV) {
      return true;
    }
    return (this.v === other.v && this.u === other.u);
  }
  close(other: uvPair) {
    if (this.v <= 1 && other.v <= 1) {
      return true;
    }
    if (this.v >= this.context.kMaxV - 1 && other.v >= this.context.kMaxV - 1) {
      return true;
    }
    return (Math.abs(this.v - other.v) <= 1 &&
      Math.abs(this.u - other.u) <= 1);
  }
}

class PlasmaState {
  constructor(public a: uvPair, public b: uvPair,
    public c: uvPair, public depth: number) { }
}


export class Plasma {
  readonly r: Float32Array = null;
  readonly context: uvContext;
  private resolution: number;

  constructor(res: number, private random: Random) {
    this.resolution = 2 * Math.round((res - 1) / 2) + 1;

    this.context = new uvContext(this.resolution);
    this.r = new Float32Array(this.context.kWidth * this.context.kWidth / 2);

    const t = new uvPair(0, 0, this.context);
    const b = new uvPair(0, this.context.kMaxV, this.context);
    const midV = Math.round(this.context.kWidth / 4);
    const pitchU = Math.round(this.context.kWidth / 4)
    const m1 = new uvPair(0, midV, this.context);
    const m2 = new uvPair(pitchU, midV, this.context);
    const m3 = new uvPair(2 * pitchU, midV, this.context);
    const m4 = new uvPair(3 * pitchU, midV, this.context);
    const m5 = new uvPair(4 * pitchU, midV, this.context);
    for (let u = 0; u < this.context.kWidth; ++u) {
      this.setUV(u, t.v, 1);
      this.setUV(u, b.v, 1);
    }

    this.maybeSet(m1, 1 + random.next());
    this.maybeSet(m2, 1 + random.next());
    this.maybeSet(m3, 1 + random.next());
    this.maybeSet(m4, 1 + random.next());

    const queue: PlasmaState[] = [];
    this.plasma(new PlasmaState(t, m1, m2, 0), queue);
    this.plasma(new PlasmaState(t, m2, m3, 0), queue);
    this.plasma(new PlasmaState(t, m3, m4, 0), queue);
    this.plasma(new PlasmaState(t, m4, m5, 0), queue);
    this.plasma(new PlasmaState(b, m1, m2, 0), queue);
    this.plasma(new PlasmaState(b, m2, m3, 0), queue);
    this.plasma(new PlasmaState(b, m3, m4, 0), queue);
    this.plasma(new PlasmaState(b, m4, m5, 0), queue);

    while (queue.length > 0) {
      // remove first item from the queue and run it.
      const state = queue.shift();
      // console.log(`AAAAA state: ${JSON.stringify(state)}`);
      this.plasma(state, queue);
    }

    let prev = 1.0;
    for (let i = 0; i < this.r.length; ++i) {
      if (!(this.r[i] > 0.1) || this.r[i] > 5) {
        this.r[i] = prev;
      } else {
        prev = this.r[i];
      }
    }

  }


  private setUV(u: number, v: number, val: number) {
    this.r[u + v * this.context.kWidth] = val;
  }
  private maybeSet(p: uvPair, val: number) {
    const v = p.v;
    const u = (v === 0 || v === this.context.kMaxV) ? 0 : p.u % (this.context.kWidth);
    if (this.r[u + v * this.context.kWidth] === 0) {
      this.r[u + v * this.context.kWidth] = val;
    }
  }

  private get(p: uvPair): number {
    const v = p.v;
    const u = (v === 0 || v === this.context.kMaxV) ? 0 : p.u % (this.context.kWidth);
    const result = this.r[u + v * this.context.kWidth];
    return result;
  }

  private subdivide(p1: uvPair, p2: uvPair, magnitude: number): uvPair {
    const val1 = this.get(p1);
    const val2 = this.get(p2);
    const mid = uvPair.mid(p1, p2);
    if (this.get(mid) === 0) {
      let newVal = (this.random.next() - 0.5) * magnitude +
        (val1 + val2) / 2;
      newVal = Math.max(0.1, newVal);
      this.maybeSet(mid, newVal);
    }
    return mid;
  }

  // By construction, a must always be the top or bottom of the triangle.
  private plasma(s: PlasmaState,
    queue: PlasmaState[]) {

    if (s.a.close(s.b) && s.b.close(s.c) && s.c.close(s.a)) {
      return; // nothing to do.
    }
    if (s.depth > 20) {
      throw new Error('Exhausted!');
    }
    // console.log(`AAAAA work: ${JSON.stringify(s)}`);

    const magnitude = this.getMagnitude(s.b, s.c, s.depth);
    const nextTri: uvPair[] = [];
    const ab = this.subdivide(s.a, s.b, magnitude);
    const bc = this.subdivide(s.b, s.c, magnitude);
    const ac = this.subdivide(s.a, s.c, magnitude);
    queue.push(new PlasmaState(s.a, ab, ac, s.depth + 1));
    queue.push(new PlasmaState(bc, ab, ac, s.depth + 1));
    queue.push(new PlasmaState(ab, s.b, bc, s.depth + 1));
    queue.push(new PlasmaState(ac, bc, s.c, s.depth + 1));
  }

  private getMagnitude(uv1: uvPair, uv2: uvPair, depth: number): number {
    const deltaURad = Math.abs(uv1.u - uv2.u) / this.context.kWidth * Math.PI * 2;
    if (uv1.v !== uv2.v) {
      throw new Error(
        `Misformed base: ${JSON.stringify(uv1)} ${JSON.stringify(uv2)}`);
    };
    // Measured from north pole.
    const vrad = uv1.v / this.context.kWidth * Math.PI * 2;
    const arcLength = deltaURad * Math.sin(vrad);
    return 0.5 * arcLength;
  }

  // Radius is ~1.  The caller can scale this if desired.
  getRadiusForUV(u: number, v: number): number {
    const iFloat = u * this.context.kWidth;
    const jFloat = v * this.context.kMaxV;

    let iLow = Math.floor(iFloat);
    let iHigh = iLow + 1;
    let iP = iFloat - iLow;

    let jLow = Math.floor(jFloat);
    let jHigh = iLow + 1;
    let jP = jFloat - jLow;

    iLow = iLow % (this.context.kWidth / 2);
    iHigh = iHigh % (this.context.kWidth / 2);
    jLow = Math.max(0, jLow);
    jHigh = Math.min(jLow, this.context.kMaxV);

    const r00 = this.r[iLow + jLow * this.context.kWidth];
    const r01 = this.r[iLow + jHigh * this.context.kWidth];
    const r10 = this.r[iHigh + jLow * this.context.kWidth];
    const r11 = this.r[iHigh + jHigh * this.context.kWidth];

    const r0 = r01 * jP + r00 * (1 - jP);
    const r1 = r11 * jP + r10 * (1 - jP);
    const r = r1 * iP + r0 * (1 - iP);
    return r;
  }

  private tmp = new THREE.Vector3();
  getRadiusForVector(vec: THREE.Vector3): number {
    this.tmp.copy(vec);
    vec.normalize();
    const theta = Math.atan2(vec.z, vec.x);
    const rho = Math.asin(vec.y);
    const u = theta / (2 * Math.PI) + 0.5;
    const v = rho / Math.PI + 0.5;
    return this.getRadiusForUV(u, v);
  }
}