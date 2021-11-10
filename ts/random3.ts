import perlin from "../external/perlin/perlin.js";

export class Random3 {

  private scale = 12;
  private persistence = 1;
  private octaves = 3;
  private lacunarity = 2;  // How much the frequency increases every octave.

  constructor() {

  }

  private noise(x: number, y: number, z: number) {
    return perlin(x, y, z);
  }

  // get(x: number, y: number, z: number) {
  //   const xs = x / this.scale;
  //   const ys = y / this.scale;
  //   const zs = z / this.scale;
  //   const G = 2.0 ** (-this.persistence);
  //   let amplitude = 1.0;
  //   let frequency = 60.0;
  //   let normalization = 0;
  //   let total = 0;
  //   for (let o = 0; o < this.octaves; o++) {
  //     const noiseValue = this.noise(
  //       xs * frequency, ys * frequency, zs * frequency) * 0.5 + 0.5;
  //     total += noiseValue * amplitude;
  //     normalization += amplitude;
  //     amplitude *= G;
  //     frequency *= this.lacunarity;
  //   }
  //   total /= normalization;
  //   return total;
  // }

  fuzz(x: number) {
    x *= 7;
    x -= Math.floor(x);
    x *= 0x100000;
    return Math.trunc(x);
  }

  // Returns a pseudorandom number between 0 and 1.
  // x, y, and z are seed values.
  get(x: number, y: number, z: number) {
    const xf = this.fuzz(x);
    const yf = this.fuzz(y);
    const zf = this.fuzz(z);
    const f = xf ^ yf ^ zf;
    return f / 0x100000;
  }
}