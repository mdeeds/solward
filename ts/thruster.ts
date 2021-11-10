import * as THREE from "three";
import { RGBA_ASTC_10x10_Format } from "three";

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SimpleText } from "./simpleText";

export type Side = 'left' | 'right';

export class Thruster extends THREE.Object3D {
  private tex: SimpleText;
  private timeRemainingS = 5 * 60;

  private fullScale: number;
  private thrustScale: THREE.Vector3;

  constructor(readonly side: Side) {
    super();
    const loader = new GLTFLoader();
    this.tex = new SimpleText(256, 256, true);
    loader.load('model/thruster.gltf', (gltf) => {
      this.add(gltf.scene);
      gltf.scene.traverse((object) => {
        console.log(`Loaded: ${object.name}`);
        if (object instanceof THREE.Mesh) {
          for (const a of object.animations) {
            console.log(`A: ${a.name}`);
          }
          if (object.name === 'Display') {
            console.log('DISPLAY!');
            const material = new THREE.MeshBasicMaterial();
            material.map = this.tex;
            this.tex.setText('\n\nHello!');
            object.material = material;
          } else if (object.name === 'Flame') {
            this.fullScale = object.scale.x;
            this.thrustScale = object.scale;
            this.thrustScale.multiplyScalar(0.1);
            object.material.transparent = true;
            object.material.opacity = 0.2;
            // object.material = new THREE.MeshPhysicalMaterial(
            //   { transparent: true, color: 0x222233, emissive: 0x7777cc, roughness: 1.0 });
          }
        }
      });
    }, undefined, function (error) {
      console.error(error);
    });

  }

  private lastUpdateS: number = 0;
  tick(elapsedS: number, deltaS: number) {
    if (elapsedS - this.lastUpdateS < 0.05) {
      return;
    }
    this.lastUpdateS = elapsedS;
    if (this.side === 'left') {
      this.timeRemainingS = Math.max(0, this.timeRemainingS - elapsedS);
      if (this.tex) {
        let m = "";
        for (let i = 0; i < 6; ++i) {
          m = m + `${i}: ${this.timeRemainingS.toFixed(2)}\n`;
        }
        this.tex.setText(m);
      }
    } else {
      if (this.tex) {
        let m = `raf: ${(deltaS * 1000).toFixed(1)}\n` +
          `fps: ${(1 / deltaS).toFixed(1)}`;
        this.tex.setText(m);
      }
    }
  }

  on() {
    this.thrustScale.set(this.fullScale, this.fullScale, this.fullScale);
  }

  off() {
    const s = 0.1 * this.fullScale;
    this.thrustScale.set(s, s, s);
  }
}