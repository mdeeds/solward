import * as THREE from "three";

import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js"
import { Plasma } from "./plasma";
import { Random } from "./random";

export class Octohedron extends THREE.Mesh {
  constructor(radius: number, plasma: Plasma) {
    const f = (u: number, v: number, target: any) => {
      const theta = Math.PI * 2 * u;
      const rho = Math.PI * v;
      const r = plasma.getRadiusForUV(u, v) * radius;
      // const r = radius;
      if (!(r > 0.001)) {
        throw new Error(`out of range.`);
      }
      const rr = r * Math.sin(rho);
      // console.log(`${u.toFixed(4)} ${v.toFixed(4)} => ` +
      //   `${r.toFixed(2)} @ ${i}, ${j}; ${rr.toFixed(4)}`);

      target.set(rr * Math.cos(theta),
        r * Math.cos(rho),
        rr * Math.sin(theta));
    }

    const geometry = new ParametricGeometry(
      f, /*slices=*/plasma.context.kWidth,
      /*stacks=*/plasma.context.kWidth / 2);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      color: '#fff',
      roughness: 0.4,
    });
    super(geometry, material);
    super.castShadow = true;
    super.receiveShadow = true;

    // switch (Math.floor(random.next() * 4)) {
    //   case 0: break;
    //   case 1: material.emissive = new THREE.Color(0x111100); break;
    //   case 2: material.emissive = new THREE.Color(0x040400); break;
    //   case 3:
    //     const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    //     const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x002200 });
    //     const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    //     this.mesh.add(wireframe);
    //     break;
    // }
  }
}