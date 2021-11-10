export interface Ticker {
  tick(elapsedS: number, deltaS: number): void;
}