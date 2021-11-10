import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Patch } from "./patch";
import { Random3 } from "./random3";
import { Ticker } from "./ticker";

export class PatchCube extends THREE.Group implements Ticker {
  private faces: Patch[] = [];

  private bakedMesh: THREE.Mesh = null;

  private faceRotations: THREE.Euler[] = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(0, Math.PI / 2, 0),
    new THREE.Euler(0, Math.PI, 0),
    new THREE.Euler(0, -Math.PI / 2, 0),
    new THREE.Euler(Math.PI / 2, 0, 0),
    new THREE.Euler(-Math.PI / 2, 0, 0)];

  constructor(name: string, private camera: THREE.Camera) {
    super();
    for (let i = 0; i < 6; ++i) {
      const p = new Patch(this.faceRotations[i], new THREE.Vector3(), 2,
        new Random3());
      this.faces.push(p);
      super.add(p);
    }
  }

  shrinkWrap(other: THREE.Mesh) {
    let radius = 0;
    if (other.geometry instanceof THREE.BufferGeometry) {
      const positionsArray = other.geometry.getAttribute('position').array;
      const v = new THREE.Vector3();
      for (let i = 0; i < positionsArray.length; i += 3) {
        v.set(
          positionsArray[i + 0], positionsArray[i + 1], positionsArray[i + 2]);
        v.multiplyVectors(v, other.scale);
        radius = Math.max(radius, v.length());
      }
    }
    if (radius === 0) {
      radius = 1.0;
    }
    for (let faceIndex = 0; faceIndex < 6; ++faceIndex) {
      this.faces[faceIndex].shrinkWrap(other, 1 / radius);
    }
  }

  noiseAll() {
    for (let faceIndex = 0; faceIndex < 6; ++faceIndex) {
      this.faces[faceIndex].noiseAll();
    }
  }

  bake() {
    const geometries: THREE.BufferGeometry[] = [];
    for (const p of this.faces) {
      this.bakeInternal(geometries, p);
    }
    const baked =
      BufferGeometryUtils.mergeBufferGeometries(geometries, false);
    this.bakedMesh = new THREE.Mesh(baked, this.faces[0].material);
    for (const c of this.children) {
      this.remove(c);
    }
    this.add(this.bakedMesh);
  }

  private bakeInternal(geometries: THREE.BufferGeometry[],
    patch: Patch) {
    if (patch.childPatches && patch.childPatches.length) {
      for (const p of patch.childPatches) {
        this.bakeInternal(geometries, p);
      }
    } else {
      geometries.push(patch.geometry);
    }
  }

  tick(elapsedS: number) {
    if (!!this.bakedMesh) {
      return;
    }
    const cameraWorldPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraWorldPosition);
    for (const face of this.faces) {
      face.updateResolution(cameraWorldPosition, this);
    }
  }
}