import * as THREE from "three";

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Hand } from './hand';
import { Field } from './field';
import { Cinema } from './cinema';
import { Gamepads } from "./gamepads";
import { SimpleText } from "./simpleText";
import { Ticker } from "./ticker";
import { SkySphere } from "./skySphere";
import { Player } from "./player";

export class VR {
  private boost = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private playerVelocity = new THREE.Vector3(0, 0, 0.001);

  constructor() {
    var renderer = new THREE.WebGLRenderer();
    const camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1,
      SkySphere.kRadius * 1.01);
    const scene = new THREE.Scene();
    const player = new Player(this.playerVelocity);
    const system = new THREE.Group();

    this.setUpRenderer(renderer, scene, player, system);

    let views: Ticker[] = [];
    switch (new URL(document.URL).searchParams.get('view')) {
      case 'cinema': views.push(new Cinema(system, camera)); break;
      default: views.push(new Field(system, player, scene, camera)); break;
    }

    const controllers: Hand[] = [];

    for (let i = 0; i < 2; ++i) {
      const h = new Hand(i, renderer, player);
      controllers.push(h);
      views.push(h);
    }
    player.add(camera);

    const clock = new THREE.Clock();
    const gamepads = new Gamepads();
    const out = new THREE.Vector3();
    const right = new THREE.Vector3();

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      renderer.render(scene, camera);
      this.updateBoost(controllers, deltaS);
      gamepads.updateRotation(player, renderer, camera);
      this.tmp.copy(this.playerVelocity);
      this.tmp.multiplyScalar(deltaS);
      system.position.sub(this.tmp);
      for (const view of views) {
        view.tick(clock.elapsedTime, deltaS);
      }

      // Gamepads.getRightVector(camera, right);
      // t.setText(`right: ${right.x.toFixed(2)} ${right.y.toFixed(2)} ${right.z.toFixed(2)}`);
      Gamepads.getOutVector(camera, out);
      // t.setText(`out: ${out.x.toFixed(2)} ${out.y.toFixed(2)} ${out.z.toFixed(2)}`);
    });
    this.addKeyboardHandler(camera, out, right, player);
  }

  private setUpRenderer(renderer: THREE.WebGLRenderer, scene: THREE.Scene,
    player: THREE.Group, system: THREE.Group) {
    renderer.shadowMap.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));
    renderer.xr.enabled = true;
    scene.add(player);
    system.castShadow = true;
    system.receiveShadow = true;
    scene.add(system);
    // https://astronomy.stackexchange.com/questions/10576/how-to-orient-esos-milky-way-panorama-in-a-3d-model
    // const sky = new SkySphere('img/sky-polaris.jpg');
    const sky = new SkySphere('img/sky.jpg');
    sky.rotateX(-Math.PI * 23 / 32);
    sky.rotateZ(0.8);
    scene.add(sky);

  }

  private addKeyboardHandler(
    camera: THREE.Camera, out: THREE.Vector3, right: THREE.Vector3,
    player: THREE.Group) {
    document.querySelector('body').addEventListener('keydown',
      (ev: KeyboardEvent) => {
        Gamepads.getOutVector(camera, out);
        Gamepads.getRightVector(camera, right);
        this.tmp.set(0, 0, 0);
        const dv = 2.0;
        switch (ev.code) {
          case 'KeyU': this.tmp.set(0, 0, dv); break;
          case 'Space':
          case 'KeyO': this.tmp.set(0, 0, -dv); break;
          case 'KeyI': this.tmp.set(0, dv, 0); break;
          case 'KeyK': this.tmp.set(0, -dv, 0); break;
          case 'KeyJ': this.tmp.set(-dv, 0, 0); break;
          case 'KeyL': this.tmp.set(dv, 0, 0); break;
          case 'ArrowLeft': player.rotateOnAxis(out, -Math.PI / 32); break;
          case 'ArrowRight': player.rotateOnAxis(out, Math.PI / 32); break;
          case 'ArrowDown': player.rotateOnAxis(right, -Math.PI / 32); break;
          case 'ArrowUp': player.rotateOnAxis(right, Math.PI / 32); break;
          case 'KeyQ': camera.rotateY(Math.PI / 32); break;
          case 'KeyW': camera.rotateY(-Math.PI / 32); break;
        }
        this.playerVelocity.add(this.tmp);
      });
  }

  private updateBoost(controllers: Hand[], elapsedS: number) {
    this.boost.set(0, 0, 0);
    for (const h of controllers) {
      if (h.isBoosting()) {
        h.copyBoostVector(this.tmp);
        this.boost.add(this.tmp);
      }
    }
    // each booster can accelerate you at 1G
    this.boost.multiplyScalar(9.8 * elapsedS);
    this.playerVelocity.add(this.boost);
  }
}