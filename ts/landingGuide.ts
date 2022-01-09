import * as THREE from "three";

export class LandingGuide extends THREE.Mesh {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.Texture;
  private targetDetails: object;
  constructor() {
    const geometry = new THREE.PlaneGeometry(4, 4, 1, 1);
    //const geometry = new THREE.BoxGeometry(5, 5, 5);
    geometry.rotateY(Math.PI);
    geometry.translate(0, 0, 4);
    const canvas = document.createElement('canvas') as unknown as HTMLCanvasElement;
    canvas.width = 512;
    canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, side: THREE.DoubleSide,
    });
    // const material = new THREE.MeshBasicMaterial({ color: '#00f' });
    super(geometry, material);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tex = texture;
  }

  setTargetDetails(details: object) {
    this.targetDetails = details;
  }

  private decelerationMeter(decelerationMpSS: number) {
    const left = this.canvas.width - 30;
    const bottom = this.canvas.height - 30;

    const meterLength = this.canvas.height - 60;
    const p = Math.min(1, decelerationMpSS / 9.8 / 2);

    this.ctx.fillRect(left, bottom - meterLength * p,
      15, meterLength * p);
  }

  setDistance(x: number, v: number) {
    // x = 1/2 a t^2 
    // v = at
    // x = 1/2 a (v/a)^2 = 1/2 v^2 / a
    // a = 1/2 v^2 / x
    const requiredDeceleration = 1 / 2 * v * v / x;
    if (v <= 0 || requiredDeceleration < 9.8) {
      this.ctx.strokeStyle = '#0f0';
    } else if (requiredDeceleration < 9.8 * 2) {
      this.ctx.strokeStyle = '#ff0';
    } else {
      this.ctx.strokeStyle = '#f00';
    }

    this.decelerationMeter(requiredDeceleration);

    const r = Math.max(0, Math.min(250, x));
    this.ctx.lineWidth = 10;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2,
      r, -Math.PI, Math.PI);
    this.ctx.stroke();
    this.tex.needsUpdate = true;

    this.ctx.font = 'monospace 25px';
    this.ctx.fillStyle = '#8af';
    let y = 30;
    for (const k in this.targetDetails) {
      const v = this.targetDetails[k];
      this.ctx.fillText(`${k}: ${v}`, 5, y);
      y += 25;
    }
  }
}