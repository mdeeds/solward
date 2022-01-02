import * as THREE from "three";
import { BufferGeometry } from "three";
import { Fractaline } from "./fractaline";
import { Model } from "./model";

export class Debug5 {
  constructor() {
    const body = document.querySelector('body');
    const scene = new THREE.Scene();

    var renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    const camera = new THREE.PerspectiveCamera(
      5, 1.0, 0.1, 3000);
    camera.position.set(0, 0, 0);
    renderer.setSize(800, 800);
    body.appendChild(renderer.domElement);
    this.light(scene);

    const clock = new THREE.Clock();
    clock.start();

    const sp = new URL(document.URL).searchParams;
    const objects: THREE.Object3D[] = [];
    let ballMesh: THREE.Mesh = null;

    // const g: THREE.BufferGeometry = new THREE.OctahedronGeometry(20);
    // const ballGeometry = Fractaline.fromBufferGeometry(g);
    // ballGeometry.subdivide(null, 0.5);
    // ballGeometry.updateGeometry();
    // const ballMaterial = new THREE.MeshStandardMaterial(
    //   { color: 0xffffff });
    // const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    Model.Load('model/jack.gltf', { singleSided: true }).then(
      (m) => {
        ballMesh = m.getMesh('Sphere');
        ballMesh.position.set(0, 0, -100);
        const f = Fractaline.fromBufferGeometry(ballMesh.geometry);
        f.subdivide(null, 0.01);
        f.updateGeometry();
        ballMesh.geometry = f;
        scene.add(ballMesh);
      });

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      const theta = clock.getElapsedTime();
      if (ballMesh) {
        ballMesh.rotation.y = theta;
      }
      renderer.render(scene, camera);
    });

    console.log('done.');
  }

  light(scene: THREE.Scene) {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 100, 100);
    scene.add(light);
  }
}