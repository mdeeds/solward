import * as THREE from "three";
import { Thruster } from "./thruster";

export class Debug3 {
  constructor() {
    const body = document.querySelector('body');
    const scene = new THREE.Scene();

    var renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    const camera = new THREE.PerspectiveCamera(
      75, 1.0, 0.1, 3000);
    camera.position.set(0, 0, 0);
    renderer.setSize(800, 800);
    body.appendChild(renderer.domElement);
    this.light(scene);

    const clock = new THREE.Clock();
    clock.start();

    const booster = new Thruster('right');
    booster.translateZ(-1);
    booster.rotateY(-Math.PI / 2);
    booster.rotateZ(Math.PI);
    scene.add(booster);

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      const theta = clock.getElapsedTime() / 5;
      renderer.render(scene, camera);
      booster.tick(clock.elapsedTime, deltaS);
    });

    console.log('done.');
  }

  light(scene: THREE.Scene) {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 0, 100);
    scene.add(light);
  }
}