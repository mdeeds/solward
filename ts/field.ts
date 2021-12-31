import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

import Ammo from "ammojs-typed";
import { Random } from "./random";
import { Ticker } from "./ticker";
import { Player } from "./player";
import { SkySphere } from "./skySphere";
import { Mission, Mission1 } from "./mission";
import { HomeAsteroid } from "./home";
import { Fractaline } from "./fractaline";
import { Physics } from "./physics";

export class Field implements Ticker {
  private mission: Mission;
  constructor(private system: THREE.Group,
    private player: Player,
    scene: THREE.Scene | THREE.Group, private camera: THREE.Camera,
    private physics: Physics) {

    this.mission = new Mission1();
    const initialPosition = this.mission.getInitialPlayerPosition();
    initialPosition.multiplyScalar(-1);
    this.system.position.copy(initialPosition);
    this.player.rotation.copy(this.mission.getInitialRotation());

    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(0, SkySphere.kRadius / 2, 0);
    light.target.position.set(0, 0, 0);
    scene.add(light);

    const headlamp = new THREE.PointLight(0xfffffff, 1.0, 30, 2);
    player.add(headlamp);

    {
      const sunRadius = 695700;
      const sunDistanceToPlayer = 2 * 1.496e8;
      const r = sunRadius / sunDistanceToPlayer * SkySphere.kRadius;

      const loader = new THREE.TextureLoader();
      loader.load(
        'img/sun.jpg',
        function (texture) {
          console.log('loaded sun');
          const sunGeometry = new THREE.PlaneGeometry(r * 10, r * 10);
          const sunMaterial = new THREE.MeshBasicMaterial({
            map: texture
          });
          const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
          sunMesh.position.set(0, SkySphere.kRadius / 2, 0);
          sunMesh.rotation.set(0, Math.PI / 2, 0);
          scene.add(sunMesh);
        });
    }

    const posRandom = new Random('positions');

    const homePosition = new THREE.Vector3(0, 0, 160);
    const home = new HomeAsteroid(system, homePosition);

    const num = new URL(document.URL).searchParams.get('n');
    let numAsteroids = 300;
    if (num) {
      numAsteroids = parseInt(num);
    }
    let asteroidGeometry: THREE.BufferGeometry =
      new THREE.IcosahedronBufferGeometry(1, 2);
    asteroidGeometry =
      BufferGeometryUtils.mergeVertices(asteroidGeometry, 0.01);
    asteroidGeometry.computeVertexNormals();

    const f = Fractaline.fromBufferGeometry(asteroidGeometry);
    f.subdivide(null, 0);
    f.updateGeometry();
    console.log('subdivide done');

    const asteroidShape = this.physics.createShapeFromGeometry(f);

    const asteroidMaterial = new THREE.MeshStandardMaterial(
      { color: 0xffffff, metalness: 1, roughness: 0.7 });
    const instancedMesh = new THREE.InstancedMesh(
      f, asteroidMaterial, numAsteroids)
    this.system.add(instancedMesh);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < numAsteroids; ++i) {
      const range = 30000;
      const r = 5000 / (100 * posRandom.next() + 5);
      dummy.position.set(
        (posRandom.next() - 0.5) * range,
        (posRandom.next() - 0.5) * range,
        (posRandom.next() - 0.5) * range);
      dummy.scale.set(r, r, r);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
  }

  tick(elapsedS: number, deltaS: number) {

  }

}