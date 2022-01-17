import * as THREE from "three";
import { Hand } from "./hand";

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

    const hand = new Hand(0, renderer, scene, camera, scene);
    hand.testBoosterPosition(scene);
    // const booster = new Thruster('right');
    // booster.translateZ(-1);
    // booster.rotateY(-Math.PI / 2);
    // booster.rotateZ(Math.PI);
    // scene.add(booster);

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      const theta = clock.getElapsedTime() / 5;
      renderer.render(scene, camera);
      hand.tick(clock.elapsedTime, deltaS);
    });

    body.addEventListener('keydown', (ev) => {
      if (ev.code == 'Space') {
        hand.on();
      }
    });
    body.addEventListener('keyup', (ev) => {
      if (ev.code == 'Space') {
        hand.off();
      }
    });

    console.log('done.');
  }

  light(scene: THREE.Scene) {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 0, 100);
    scene.add(light);
  }
}