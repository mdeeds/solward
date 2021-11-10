import * as THREE from "three";
import { CSG } from "three-csg-ts";
export class Debug2 {
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

    const objects: THREE.Object3D[] = [];

    const clock = new THREE.Clock();
    clock.start();

    renderer.setAnimationLoop(() => {
      const theta = clock.getElapsedTime() / 5;
      renderer.render(scene, camera);
      for (const o of objects) {
        o.rotation.y += 0.01 / o.scale.x;
        o.position.z = (Math.sin(theta) - 1) * 8 - o.scale.x;
      }
    });

    const geometry = new THREE.IcosahedronBufferGeometry(1, 2);
    const material = new THREE.MeshStandardMaterial(
      { color: 0xffffff, metalness: 1.0, roughness: 0.6 });
    const mesh = new THREE.Mesh(geometry, material);
    // scene.add(mesh);
    // objects.push(mesh);

    let craterMesh = mesh as THREE.Mesh;
    for (let i = 0; i < 30; ++i) {
      craterMesh = this.crater(craterMesh);
      console.log(
        `Crater number: ${i} [${window.performance.now().toFixed(2)}]`);
    }
    objects.push(craterMesh);
    scene.add(craterMesh);

    console.log('done.');
  }

  crater(baseMesh: THREE.Mesh): THREE.Mesh {
    const baseCsg = CSG.fromMesh(baseMesh);

    const otherRadius = Math.random() * 0.5 + 0.1;

    const otherGeometry = new THREE.IcosahedronBufferGeometry(otherRadius, 1);
    const position = new THREE.Vector3();
    this.getRandomPosition(position);
    this.getPositionOnSurface(position, baseMesh,
      Math.random() * otherRadius, position);

    otherGeometry.translate(position.x, position.y, position.z);
    const otherMesh = new THREE.Mesh(otherGeometry, baseMesh.material);
    const otherCsg = CSG.fromMesh(otherMesh);

    const resultCsg = baseCsg.subtract(otherCsg);
    return resultCsg.toMesh(baseMesh.matrixWorld, baseMesh.material);
  }

  getRandomPosition(p: THREE.Vector3) {
    p.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  }

  getPositionOnSurface(p: THREE.Vector3, mesh: THREE.Mesh, altitude: number,
    outPosition: THREE.Vector3) {
    const direction = new THREE.Vector3();
    direction.copy(p);
    direction.normalize();
    direction.multiplyScalar(-1);
    p.setLength(10);
    const targetCenter = new THREE.Vector3();
    targetCenter.applyMatrix4(mesh.matrixWorld);
    p.add(targetCenter);
    const raycaster = new THREE.Raycaster(p, direction);
    const intersections = raycaster.intersectObject(mesh);
    if (!intersections || intersections.length === 0) {
      return;
    }
    outPosition.copy(intersections[0].point);
    direction.multiplyScalar(-1);
    direction.setLength(altitude);
    outPosition.add(direction);
  }


  light(scene: THREE.Scene) {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 0, 100);
    // light.shadow.mapSize.width = 2048
    // light.shadow.mapSize.height = 2048
    // light.shadow.camera.near = 10
    // light.shadow.camera.far = 1000
    // light.castShadow = true;
    // const sb = new URL(document.URL).searchParams.get('sb');
    // if (sb) {
    //   light.shadow.bias = parseFloat(sb);
    //   console.log(light.shadow.bias);
    // } else {
    //   light.shadow.bias = -0.0001;
    // }
    scene.add(light);
  }
}