import * as THREE from "three";
import { Mesh, Object3D } from "three";

export type SetVector = (target: THREE.Vector3) => void;

export class Gamepads {
  constructor() {
  }

  // Modifies rotation based on current position of gamepads
  private out = new THREE.Vector3();
  private right = new THREE.Vector3();
  updateRotation(player: THREE.Group,
    renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    const rate = 0.01;
    Gamepads.getOutVector(camera, this.out);
    Gamepads.getRightVector(camera, this.right);
    const session = renderer.xr.getSession();
    if (session) {
      if (session.inputSources) {
        for (const source of session.inputSources) {
          const axes = source.gamepad.axes.slice(0);
          if (axes.length >= 4) {
            player.rotateOnAxis(this.out, axes[2] * rate);
            player.rotateOnAxis(this.right, axes[3] * rate);
          }
        }
      }
    }
  }

  static getOutVector(camera: THREE.Camera, out: THREE.Vector3) {
    out.set(0, 0, -1);
    out.applyEuler(camera.rotation);
  }

  static getRightVector(camera: THREE.Camera, right: THREE.Vector3) {
    right.set(1, 0, 0);
    right.applyEuler(camera.rotation);
  }
}