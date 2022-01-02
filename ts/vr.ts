import * as THREE from "three";

import Ammo from "ammojs-typed";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Hand } from './hand';
import { Field } from './field';
import { Cinema } from './cinema';
import { Gamepads } from "./gamepads";
import { SimpleText } from "./simpleText";
import { Ticker } from "./ticker";
import { SkySphere } from "./skySphere";
import { Player } from "./player";
import { Physics } from "./physics";
import { ProximityGroup } from "./proximityGroup";

export class VR {
  private boost = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private physics: Physics;
  private player: Player;
  private proximityGroup: ProximityGroup;

  private constructor(private ammo: typeof Ammo) {
    var renderer = new THREE.WebGLRenderer();
    const camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1,
      SkySphere.kRadius * 1.01);
    const scene = new THREE.Scene();

    let tickers: Ticker[] = [];
    this.initPhysics();

    this.player = new Player();
    this.physics.addKinematicBody(1, this.player);
    const system = new THREE.Group();
    this.proximityGroup = new ProximityGroup(this.player.position);

    this.setUpRenderer(renderer, scene, this.player, system);

    switch (new URL(document.URL).searchParams.get('view')) {
      case 'cinema': tickers.push(new Cinema(system, camera)); break;
      default: tickers.push(new Field(system, this.player, scene, camera,
        this.physics, this.proximityGroup)); break;
    }

    const controllers: Hand[] = [];

    for (let i = 0; i < 2; ++i) {
      const h = new Hand(i, renderer, this.player);
      controllers.push(h);
      tickers.push(h);
    }
    this.player.add(camera);

    const clock = new THREE.Clock();
    const gamepads = new Gamepads();
    const out = new THREE.Vector3();
    const right = new THREE.Vector3();

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      this.updateBoost(controllers, deltaS);
      gamepads.updateRotation(this.player, renderer, camera);

      this.physics.tick(clock.elapsedTime, deltaS);

      const physicsObject: Ammo.btRigidBody = this.player.userData['physicsBody'];
      const ms = physicsObject.getMotionState();
      const ammoTransformTmp = new this.ammo.btTransform();
      ms.getWorldTransform(ammoTransformTmp);
      const p = ammoTransformTmp.getOrigin();
      system.position.set(-p.x(), -p.y(), -p.z());
      this.proximityGroup.setObserverPosition(
        new THREE.Vector3(p.x(), p.y(), p.z()));
      renderer.render(scene, camera);
      for (const view of tickers) {
        view.tick(clock.elapsedTime, deltaS);
      }

      // Gamepads.getRightVector(camera, right);
      // t.setText(`right: ${right.x.toFixed(2)} ${right.y.toFixed(2)} ${right.z.toFixed(2)}`);
      // Gamepads.getOutVector(camera, out);
      // t.setText(`out: ${out.x.toFixed(2)} ${out.y.toFixed(2)} ${out.z.toFixed(2)}`);
    });
    this.addKeyboardHandler(camera, out, right, this.player);
  }

  static async make(): Promise<VR> {
    return new Promise<VR>((resolve) => {
      Ammo().then((lib) => {
        resolve(new VR(lib));
      });
    })
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
        const impulse = 100 * 9.8;
        switch (ev.code) {
          case 'KeyU': this.tmp.set(0, 0, impulse); break;
          case 'Space':
          case 'KeyO': this.tmp.set(0, 0, -impulse); break;
          case 'KeyI': this.tmp.set(0, impulse, 0); break;
          case 'KeyK': this.tmp.set(0, -impulse, 0); break;
          case 'KeyJ': this.tmp.set(-impulse, 0, 0); break;
          case 'KeyL': this.tmp.set(impulse, 0, 0); break;
          case 'ArrowLeft': player.rotateOnAxis(out, -Math.PI / 32); break;
          case 'ArrowRight': player.rotateOnAxis(out, Math.PI / 32); break;
          case 'ArrowDown': player.rotateOnAxis(right, -Math.PI / 32); break;
          case 'ArrowUp': player.rotateOnAxis(right, Math.PI / 32); break;
          case 'KeyQ': camera.rotateY(Math.PI / 32); break;
          case 'KeyW': camera.rotateY(-Math.PI / 32); break;
        }
        this.physics.applyForce(this.tmp, player);
      });
  }

  private updateBoost(controllers: Hand[], deltaS: number) {
    this.boost.set(0, 0, 0);
    this.tmp.set(0, 0, 1);
    let boosted = false;
    for (const h of controllers) {
      if (h.isBoosting()) {
        h.copyBoostVector(this.tmp);
        this.boost.add(this.tmp);
        boosted = true;
      }
    }
    if (boosted) {
      // each booster can accelerate you at 1G
      this.boost.multiplyScalar(9.8 * 100);
      this.physics.applyForce(this.boost, this.player);
    }
  }

  initPhysics() {
    // Physics configuration
    const collisionConfiguration =
      new this.ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.ammo.btCollisionDispatcher(
      collisionConfiguration);
    const broadphase = new this.ammo.btDbvtBroadphase();
    const solver = new this.ammo.btSequentialImpulseConstraintSolver();
    const physicsWorld = new this.ammo.btDiscreteDynamicsWorld(
      dispatcher, broadphase,
      solver, collisionConfiguration);
    physicsWorld.setGravity(new this.ammo.btVector3(0, 0, 0));
    this.physics = new Physics(physicsWorld, this.ammo);
  }
}