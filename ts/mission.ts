import * as THREE from "three";

export interface Mission {
  getInitialPlayerPosition(): THREE.Vector3;
  getInitialRotation(): THREE.Euler;
  tick(elapsedS: number, deltaS: number): void;
  isComplete(): boolean;
  isFailed(): boolean;
}

export class Mission1 implements Mission {
  getInitialPlayerPosition(): THREE.Vector3 {
    // // A-230
    // return new THREE.Vector3(-2059 + 125, 1128, -1306);
    return new THREE.Vector3(0, 0, 0);
  }

  getInitialRotation(): THREE.Euler {
    return new THREE.Euler(0, Math.PI / 2, 0);
  }

  tick(elapsedS: number, deltaS: number) {

  }

  isComplete() {
    return false;
  }

  isFailed() {
    return true;
  }

}