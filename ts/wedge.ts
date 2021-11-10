import * as THREE from "three";
import { MaxEquation } from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { Asteroid } from "./asteroid";
import { CinemaData } from "./cinemaData";
import { Model } from "./model";
import { Patch } from "./patch";
import { Random } from "./random";


export class Wedge extends THREE.Mesh {
  constructor(posRandom: Random, config: CinemaData) {
    super();
    if (posRandom && config) {
      this.build(posRandom, config);
    }
  }

  private async build(posRandom: Random, config: CinemaData) {
    const n = config.n / config.numWedges;
    const geometries: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; ++i) {
      const theta = Math.PI * 2 * posRandom.next() / config.numWedges;
      const r = Math.abs(config.sunZ) + posRandom.nextGaussian() * config.beltWidth;
      const x = Math.cos(theta) * r;
      const y = config.sunY + config.beltThickness * posRandom.nextGaussian();
      const z = Math.sin(theta) * r;
      const asteroidR = 1 + posRandom.next() * config.astS;

      // const modelFile =
      //   `model/asteroid${Math.floor(Asteroid.layout.next() * 10 + 1)}.gltf`;
      // const o = await Model.LoadCached(modelFile);
      // Wedge.traverseMeshes(o, (m: THREE.Mesh) => {
      //   const g = m.geometry.clone();
      //   let obj = m as THREE.Object3D;
      //   while (obj != null) {
      //     g.translate(obj.position.x, obj.position.y, obj.position.z);
      //     obj = obj.parent;
      //   }
      //   geometries.push(g);
      // });

      const o = new THREE.IcosahedronBufferGeometry(asteroidR, 1);
      Wedge.radialNoise(o, posRandom);
      o.translate(x, y, z);
      geometries.push(o);
    }
    this.geometry =
      BufferGeometryUtils.mergeBufferGeometries(geometries, false);

    this.material = new THREE.MeshStandardMaterial(
      { color: 0xffffff, metalness: 1.0, roughness: 0.7 });
    // const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  }

  static traverseMeshes(o: THREE.Object3D, f: (m: THREE.Mesh) => void) {
    if (o instanceof THREE.Mesh) {
      f(o);
    }
    for (const c of o.children) {
      Wedge.traverseMeshes(c, f);
    }
  }

  static radialNoise(geometry: THREE.BufferGeometry, random: Random) {
    geometry = BufferGeometryUtils.mergeVertices(geometry);
    const tmp = new THREE.Vector3();
    const positionAttribute = geometry.getAttribute('position');
    for (let vIndex = 0; vIndex < positionAttribute.count; ++vIndex) {
      tmp.fromBufferAttribute(positionAttribute, vIndex);
      const noise = 1 + Math.random();
      tmp.multiplyScalar(noise);
      positionAttribute.setXYZ(vIndex, tmp.x, tmp.y, tmp.z);
    }
    geometry.setAttribute('position', positionAttribute);
    positionAttribute.needsUpdate = true;
    Patch.computeVertexNormals(
      positionAttribute, geometry.getAttribute('normal'), geometry);
  }
}