import * as THREE from "three";

export class SkySphere extends THREE.Mesh {
  public static kRadius = 100000;
  constructor(url: string) {
    const geometry = new THREE.SphereGeometry(SkySphere.kRadius, 60, 40);
    // skyBox.eulerOrder = 'XZY';
    // skyBox.renderDepth = 1000.0;
    const blackMaterial = new THREE.MeshBasicMaterial({ color: '#000' });
    super(geometry, blackMaterial);

    const loader = new THREE.ImageBitmapLoader();
    loader.load(url, (imageBitmap) => {
      console.log('load callback.');
      const texture = new THREE.CanvasTexture(imageBitmap);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
      this.material = material;
      console.log('Load complete.');
    });
    this.scale.set(1, 1, 1);
    console.log('End constructor');
  }
}