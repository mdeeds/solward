import * as THREE from "three";

import { Octohedron } from "./octohedron";
import { Random } from "./random";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js"
import { Ticker } from "./ticker";
import { Asteroid } from "./asteroid";
import { CinemaData } from "./cinemaData";
import { Wedge } from "./wedge";

export class Cinema implements Ticker {
  constructor(system: THREE.Group, camera: THREE.Camera) {
    const config = new CinemaData();
    this.make(camera, system, config);
  }

  async makeText(): Promise<THREE.Mesh> {
    const loader = new FontLoader();
    return new Promise<THREE.Mesh>((resolve, reject) => {
      loader.load('fonts/helvetiker_regular.typeface.json',
        (font) => {
          let text = 'S LWARD';
          text = text.replaceAll('', '             ').trim();
          const geometry = new TextGeometry(text, {
            font: font,
            size: 80,
            height: 1,
            curveSegments: 12,
            bevelEnabled: false,
          });
          const sunMat = new THREE.MeshBasicMaterial();
          const mesh = new THREE.Mesh(geometry, sunMat);
          resolve(mesh);
        });
    });
  }

  async makeAsteroids(
    camera: THREE.Camera, system: THREE.Group, config: CinemaData) {
    return new Promise<void>(async (resolve, reject) => {
      const posRandom = new Random('positions');
      const wedges: Wedge[] = [];
      for (let i = 0; i < 12; ++i) {
        wedges.push(new Wedge(posRandom, config));
      }
      for (let i = 0; i < config.numWedges; ++i) {
        const theta = i * Math.PI * 2 / config.numWedges;
        const g = new THREE.Group();
        const wedge = wedges[Math.floor(posRandom.next() * wedges.length)];
        g.add(wedge.clone());
        const rotation = new THREE.Matrix4();
        rotation.makeRotationY(theta);
        const translation = new THREE.Matrix4();
        translation.makeTranslation(0, 0, config.sunZ);
        g.applyMatrix4(rotation);
        g.applyMatrix4(translation);
        system.add(g);
      }
      resolve();
    });
  }

  async makeSun(camera: THREE.Camera, system: THREE.Group,
    config: CinemaData): Promise<void> {
    return new Promise((resolve, reject) => {
      const pointLight = new THREE.PointLight(0xffffff, 1.0, 0, 0);
      pointLight.position.set(0, config.sunY, config.sunZ);
      camera.lookAt(pointLight.position);
      system.add(pointLight);

      const sunGeo = new THREE.SphereGeometry(config.sunR);
      sunGeo.translate(0, config.sunY, config.sunZ);
      const sunMat = new THREE.MeshBasicMaterial();
      const sun = new THREE.Mesh(sunGeo, sunMat);
      system.add(sun);
      resolve();
    })
  }

  async make(camera: THREE.Camera, system: THREE.Group, config: CinemaData) {
    console.log('Sun...');
    await this.makeSun(camera, system, config);
    console.log('Asteroids...');
    await this.makeAsteroids(camera, system, config);
    console.log('Text...');
    this.makeText().then((mesh) => {
      mesh.rotation.set(0, -0.3, 0);
      mesh.position.set(
        -config.sunR * 9, config.sunY - config.sunR, config.sunZ);
      camera.rotation.set(0, -0.3, 0);
      mesh.scale.set(2, 2, 2);
      system.add(mesh);
    });

  }

  tick(elapsedS: number) {

  }
}