import * as THREE from "three";

import { GameEntity } from "./gameEntity";

export class Sample implements GameEntity {
  static geometry: THREE.BufferGeometry;
  static material: THREE.Material;

  private mesh: THREE.Mesh;

  constructor(private container: THREE.Object3D) {
    if (!Sample.geometry) {
      Sample.geometry = new THREE.CylinderBufferGeometry(0.5, 0.5, 1.0);
    }
    if (!Sample.material) {
      Sample.material = new THREE.MeshStandardMaterial({ color: 0xff8833 });
    }
    this.mesh = new THREE.Mesh(Sample.geometry, Sample.material);
  }

  getObject3D(): THREE.Object3D {
    return this.mesh;
  }

  removeTag() {
    this.container.remove(this.mesh);
  }

  tag() {
    this.container.add(this.mesh);
  }

  getRadius() {
    return 1.0;
  }
}