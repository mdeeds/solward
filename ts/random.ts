export class Random {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  private h: number;
  constructor(seed: string) {
    this.h = 1779033703 ^ seed.length
    for (let i = 0; i < seed.length; i++) {
      this.h = Math.imul(this.h ^ seed.charCodeAt(i), 3432918353),
        this.h = this.h << 13 | this.h >>> 19;
    }
    this.a = this.xmur();
    this.b = this.xmur();
    this.c = this.xmur();
    this.d = this.xmur();
  }

  xmur() {
    this.h = Math.imul(this.h ^ this.h >>> 16, 2246822507);
    this.h = Math.imul(this.h ^ this.h >>> 13, 3266489909);
    return (this.h ^= this.h >>> 16) >>> 0;
  }


  next(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    var t = (this.a + this.b) | 0;
    this.a = this.b ^ this.b >>> 9;
    this.b = this.c + (this.c << 3) | 0;
    this.c = (this.c << 21 | this.c >>> 11);
    this.d = this.d + 1 | 0;
    t = t + this.d | 0;
    this.c = this.c + t | 0;
    return (t >>> 0) / 4294967296;
  }

  nextGaussian(): number {
    let sum = this.next();
    sum += this.next();
    sum += this.next();
    sum += this.next();
    sum += this.next();
    sum += this.next();
    sum -= 3;
    return sum * 1.414;
  }
}