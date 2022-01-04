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
import { ProximityGroup } from "./proximityGroup";
import { Model } from "./model";

export class Field implements Ticker {
  private mission: Mission;
  constructor(private system: THREE.Group,
    private player: Player,
    scene: THREE.Scene | THREE.Group, private camera: THREE.Camera,
    private physics: Physics, private proximityGroup: ProximityGroup) {

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

    const num = new URL(document.URL).searchParams.get('n');
    let numAsteroids = 30;
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


    const asteroidMaterial = new THREE.MeshStandardMaterial(
      { color: 0xffffff, metalness: 1, roughness: 0.7 });
    const instancedMesh = new THREE.InstancedMesh(
      f, asteroidMaterial, numAsteroids)
    this.system.add(instancedMesh);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < numAsteroids; ++i) {
      const range = 30000;
      const r = 10000 / (100 * posRandom.next() + 5);
      dummy.position.set(
        (posRandom.next() - 0.5) * range,
        (posRandom.next() - 0.5) * range,
        (posRandom.next() - 0.5) * range);
      dummy.scale.set(r, r, r);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
      const asteroidShape = this.physics.createShapeFromGeometry(f);
      this.physics.addStaticBody(asteroidShape, dummy.matrix);
      this.proximityGroup.insert(instancedMesh, dummy.position);
    }
    this.buildLandingDisc();
    this.buildHome();
  }

  private async buildHome() {
    const home = await Model.Load('model/asteroid4-collider.gltf',
      { singleSided: true });
    home.scene.updateMatrix();

    this.system.add(home.scene);
    const homeShape = this.physics.createShapeFromObject(home.scene);
    home.scene.position.set(0, -200, 160);
    home.scene.updateMatrix();
    this.physics.addStaticBody(homeShape, home.scene.matrix);
    this.proximityGroup.insert(home.scene, home.scene.position);
  }

  private buildLandingDisc() {
    const geometry = new THREE.IcosahedronBufferGeometry(5, 3);
    const color = new THREE.Color(0x8080ff);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(10000, 10000, 10000);
    this.system.add(mesh);
    this.physics.addProjectionCallback(
      (distance: number, intersection: THREE.Vector3, etaS: number) => {
        mesh.position.copy(intersection);
        const velocity = distance / etaS;
        const deceleration = velocity / etaS;
        if (etaS < (1 / 10) && velocity > 15) {
          console.log(`FATAL in ${etaS} @ ${velocity}`);
        } else if (velocity < 5) {
          color.setHex(0x00ff00);
        } else if (deceleration > 2 * 9.8) {
          color.setHex(0xff8000);
        } else if (deceleration > 9.8) {
          color.setHex(0xffff00);
        } else {
          color.setHex(0x8080ff);
        }
        if (material.color.getHex() != color.getHex()) {
          material.color = color;
          material.needsUpdate = true;
        };
      });
  }

  tick(elapsedS: number, deltaS: number) {

  }

}