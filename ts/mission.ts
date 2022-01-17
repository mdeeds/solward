import * as THREE from "three";

export interface Mission {
  getInitialPlayerPosition(): THREE.Vector3;
  getInitialRotation(): THREE.Euler;
  tick(elapsedS: number, deltaS: number): void;
  isComplete(): boolean;
  isFailed(): boolean;
}

export class Mission1 implements Mission {
  constructor(private system: THREE.Group | THREE.Scene) { }
  getInitialPlayerPosition(): THREE.Vector3 {
    // // A-230
    // return new THREE.Vector3(-2059 + 125, 1128, -1306);
    return new THREE.Vector3(-18470.9, 13761.4, -24387.4);
  }

  getInitialRotation(): THREE.Euler {
    return new THREE.Euler(0, Math.PI / 2, 0);
  }

  tick(elapsedS: number, deltaS: number) {

  }

  private targetPosition = new THREE.Vector3(233, -55.8, 223.6);
  private tmp = new THREE.Vector3();
  isComplete() {
    this.tmp.copy(this.targetPosition);
    this.tmp.add(this.system.position);
    const remainingDistance = this.tmp.length();
    return remainingDistance < 10;
  }

  isFailed() {
    return true;
  }
}