/*

  getHeightData(body: HTMLElement): ImageData {
    const canvas = document.createElement('canvas');
    body.appendChild(canvas);
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff';
    ctx.filter = 'blur(4px)';
    ctx.font = '48px monospace';
    ctx.fillText('Hello!', 10, canvas.height / 2);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  makeNormals(heightData: ImageData, body: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    body.appendChild(canvas);
    canvas.width = heightData.width;
    canvas.height = heightData.height;
    const ctx = canvas.getContext('2d');
    const targetData = new ImageData(canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; ++x) {
      for (let y = 0; y < canvas.height; ++y) {
        const h = heightData.data[(x + y * canvas.width) * 4];
        const hx = heightData.data[(x + 1 + y * canvas.width) * 4];
        const hy = heightData.data[(x + (y + 1) * canvas.width) * 4];
        let dx = Math.min(255, Math.max(0, 128 + h - hx));
        let dy = Math.min(255, Math.max(0, 128 + h - hy));
        const i = (x + y * canvas.width) * 4;
        targetData.data[i + 0] = dx;
        targetData.data[i + 1] = dy;
        targetData.data[i + 2] = 128;
        targetData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(targetData, 0, 0);
    return canvas;
  }

  getNormalMap(body: HTMLElement): THREE.Texture {
    const heightData = this.getHeightData(body);
    const normalData = this.makeNormals(heightData, body);
    const tex = new THREE.CanvasTexture(normalData);
    tex.needsUpdate = true;
    return tex;
  }

*/