import * as THREE from "three";
import { Thruster } from "./thruster";

import { Ticker } from "./ticker";

export class Hand implements Ticker {
  readonly booster: Thruster;
  readonly controller: THREE.Group;
  readonly gamepad: Gamepad;

  private boosting = false;
  private boostMagnitude = 0;
  private boostJitter = 0.2;
  private boostMax = 1;
  constructor(
    index: number, renderer: THREE.WebGLRenderer,
    scene: THREE.Scene | THREE.Group) {
    const grip = renderer.xr.getControllerGrip(index);
    console.log(grip.name);
    this.booster = new Thruster(index === 0 ? 'left' : 'right');

    const pads = window.navigator.getGamepads();
    if (pads.length > index) {
      this.gamepad = pads[index];
    }
    grip.add(this.booster);
    scene.add(grip);
    this.controller = renderer.xr.getController(index);
    scene.add(this.controller);

    this.controller.addEventListener(
      'selectstart', (ev) => this.handleSelectStart(ev));
    this.controller.addEventListener(
      'selectend', (ev) => this.handleSelectEnd(ev));
    this.controller.addEventListener(
      'connected', (ev) => this.handleConnected(ev))
  }

  public isBoosting() {
    return this.boosting;
  }

  public copyBoostVector(out: THREE.Vector3) {
    this.booster.getWorldDirection(out);
    out.multiplyScalar(this.boostMagnitude);
  }

  private handleSelectStart(ev: any) {
    // const material = this.booster.material as THREE.MeshPhongMaterial;
    // material.setValues({ color: 0xff0000 });
    // material.needsUpdate = true;
    this.boosting = true;
    this.booster.on(this.boostMagnitude / this.boostMax);
    if (this.gamepad.hapticActuators.length > 0) {
      // Property 'pulse' does not exist on type 'GamepadHapticActuator'.
      if (this.gamepad.hapticActuators[0]['pulse']) {
        this.gamepad.hapticActuators[0]['pulse'](0.2, 0.5);
      }
    }
  }

  private handleSelectEnd(ev: any) {
    // const material = this.booster.material as THREE.MeshPhongMaterial;
    // material.setValues({ color: 0xffff88 });
    // material.needsUpdate = true;
    this.boosting = false;
    this.booster.off();
  }

  private handleConnected(ev: any) {
    this.controller.add(this.buildController(ev.data));
  }

  private buildController(data: any) {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    switch (data.targetRayMode) {
      case 'tracked-pointer':
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1], 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

        material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });

        return new THREE.Line(geometry, material);

      default:
        throw new Error(`not supported: ${data.targetRayMode}`)
    }
  }

  tick(elapsedS: number, deltaS: number) {
    if (this.isBoosting) {
      this.boostMagnitude += this.boostJitter * deltaS;
      this.boostMagnitude = Math.max(this.boostMagnitude, this.boostMax);
    } else {
      this.boostMagnitude = 0;
    }
    this.booster.tick(elapsedS, deltaS);
  }
}