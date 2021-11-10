import * as THREE from "three";
import { Vector3 } from "three";
import { Asteroid, ModelAsteroid } from "./asteroid";
import { LoadOptions, Model } from "./model";

import { Octohedron } from "./octohedron";
import { Patch } from "./patch";
import { PatchCube } from "./patchCube";
import { Plasma } from "./plasma";
import { Random } from "./random";
import { SimpleText } from "./simpleText";
import { Ticker } from "./ticker";

export class Debug {
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

    const asteroids: Asteroid[] = [];
    const tickers: Ticker[] = [];

    const clock = new THREE.Clock();
    clock.start();

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      const theta = clock.getElapsedTime() / 5;
      renderer.render(scene, camera);
      for (const a of asteroids) {
        const s = a.getObject3D();
        s.rotation.y += 0.01 / s.scale.x;
        s.position.z = (Math.sin(theta) - 1) * 8 - s.scale.x;
      }
      for (const t of tickers) {
        t.tick(clock.elapsedTime, deltaS);
      }
    });

    console.log('done.');
    this.asteroids(scene, camera).then((a: Asteroid) => {
      tickers.push(a);
      asteroids.push(a);
      console.log('Added a');
    });
  }

  getFirstMesh(scene: THREE.Object3D): THREE.Mesh {
    let result: THREE.Mesh = null;
    scene.traverse((o) => {
      if (!result && o instanceof THREE.Mesh) {
        result = o;
      }
    });
    if (!result) {
      throw new Error('No mesh.');
    } else {
      return result;
    }
  }

  loadAsteroid(camera: THREE.Camera): Promise<PatchCube> {
    return new Promise<PatchCube>((resolve, reject) => {
      Model.Load('model/crystals2.gltf', new LoadOptions(true)).then((o) => {
        const a = new PatchCube('cube', camera);
        const m = this.getFirstMesh(o.scene);
        a.shrinkWrap(m);
        resolve(a);
      });
    });
  }

  boxAsteroid(scene: THREE.Scene,
    camera: THREE.Camera): Promise<Asteroid> {
    return new Promise<Asteroid>((resolve, reject) => {
      const scale = 2;
      const a: Asteroid = ModelAsteroid.makeRandom(1.0,
        new THREE.Vector3(0, 0, -scale * 1.1), scene, camera, "1337 h4x0r");
      a.tag();
      resolve(a);
    });
  }

  asteroids(
    scene: THREE.Scene, camera: THREE.Camera): Promise<Asteroid> {
    return this.boxAsteroid(scene, camera);
  }

  light(scene: THREE.Scene) {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 0, 50);
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