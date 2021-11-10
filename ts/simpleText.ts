import * as THREE from "three";

export class SimpleText extends THREE.CanvasTexture {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mirror: boolean;
  constructor(width: number, height: number, mirror: boolean = false) {
    const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    super(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mirror = mirror;
    if (new URL(document.URL).searchParams.get('showcanvas')) {
      const body = document.querySelector('body');
      body.appendChild(this.canvas);
    }
  }

  setText(message: string) {
    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.mirror) {
      this.ctx.transform(
        1, 0,
        0, -1,
        0, this.canvas.height);
    }
    this.ctx.font = '50px monospace';
    this.ctx.fillStyle = '#2f2';
    let y = 50;
    for (const m of message.split("\n")) {
      this.ctx.fillText(m, 0, y, this.canvas.width);
      y += 50;
    }
    this.needsUpdate = true;
  }
}