import * as THREE from "three";

export class Debug5 {
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

    const sp = new URL(document.URL).searchParams;
    const objects: THREE.Object3D[] = [];

    const ballGeometry = new THREE.IcosahedronBufferGeometry(20, 2);
    const ballMaterial = new THREE.MeshStandardMaterial(
      { color: 0xffffff });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.position.set(0, 0, -100);
    scene.add(ballMesh);

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      const theta = clock.getElapsedTime() / 5;
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