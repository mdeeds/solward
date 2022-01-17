import * as THREE from "three";
import { ConeBufferGeometry } from "three";

export type MissionStatus = 'complete' | 'failed' | 'aborted';
export class MissionResult {
  constructor(readonly status: MissionStatus) { }
}
type ResultCallback = (result: MissionResult) => void;

export interface Mission {
  getInitialPlayerPosition(): THREE.Vector3;
  getInitialRotation(): THREE.Euler;
  tick(elapsedS: number, deltaS: number): void;
  result(): Promise<MissionResult>;
}

export class Mission1 implements Mission {
  private callbacks: ResultCallback[] = [];
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
    this.tmp.copy(this.targetPosition);
    this.tmp.add(this.system.position);
    const remainingDistance = this.tmp.length();
    if (remainingDistance < 10) {
      const result = new MissionResult('complete');
      for (const cb of this.callbacks) {
        cb(result);
      }
    }
  }

  private targetPosition = new THREE.Vector3(233, -55.8, 223.6);
  private tmp = new THREE.Vector3();

  result(): Promise<MissionResult> {
    return new Promise<MissionResult>((resolve) => {
      this.callbacks.push(resolve);
    });
  }
}