export class CinemaData {
  readonly n: number;
  readonly sunZ: number;
  readonly sunY: number;
  readonly sunR: number;
  readonly beltWidth: number;
  readonly beltThickness: number;
  readonly astS: number;
  readonly numWedges: number;
  constructor() {
    this.sunZ = -7000;
    this.sunY = -100;
    this.sunR = 100;
    this.beltWidth = 500;
    this.n = 1000;
    this.astS = 20;
    this.numWedges = 200;
    this.beltThickness = 100;

    const sp = new URL(document.URL).searchParams;
    if (sp.get('sunz')) {
      this.sunZ = parseFloat(sp.get('sunz'));
    }
    if (sp.get('suny')) {
      this.sunY = parseFloat(sp.get('suny'));
    }
    if (sp.get('wid')) {
      this.beltWidth = parseFloat(sp.get('wid'));
    }
    if (sp.get('sunr')) {
      this.sunR = parseFloat(sp.get('sunr'));
    }
    if (sp.get('n')) {
      this.n = parseInt(sp.get('n'));
    }
    if (sp.get('asts')) {
      this.astS = parseFloat(sp.get('asts'));
    }
  }
}
