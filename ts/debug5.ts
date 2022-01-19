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
      3, 1.0, 0.1, 3000);
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
        f.subdivide(0.3);
        f.subdivide(0.5);
        f.subdivide(0.3);
        f.subdivide(0.3);
        f.updateGeometry();
        ballMesh.geometry = f;
        if (sp.get('wireframe')) {
          ballMesh.material = new THREE.MeshBasicMaterial({
            color: 0xe0e0ff,
            wireframe: true
          });
        }
        scene.add(ballMesh);
      });

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      const theta = clock.getElapsedTime() / 3;
      if (ballMesh) {
        ballMesh.position.z = -5 - 100 * (Math.cos(theta) + 1);
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