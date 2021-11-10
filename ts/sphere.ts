import * as THREE from "three";
import { BufferAttribute } from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { Plasma } from "./plasma";
import { Random } from "./random";

export class Sphere extends THREE.Mesh {
  static geometries: THREE.BufferGeometry[] = [];

  constructor(plasma: Plasma, random: Random) {
    const geometryIndex = Math.floor(random.next() * 27) % 27;
    let geometry: THREE.BufferGeometry = null;
    if (Sphere.geometries[geometryIndex]) {
      geometry = Sphere.geometries[geometryIndex];
    } else {
      const dd = new THREE.IcosahedronBufferGeometry(1, 3);
      geometry = BufferGeometryUtils.mergeVertices(dd);
      // console.log(`Indexed: ${!!geometry.index}`)
      const positionAtt = geometry.attributes['position'];
      const vertices = positionAtt.array;
      // const newPoints: THREE.Vector3[] = [];
      const newArray = new Float32Array(vertices.length);
      for (let v = 0; v < vertices.length; v += 3) {
        const p = new THREE.Vector3(
          vertices[v + 0], vertices[v + 1], vertices[v + 2]);
        const r = plasma.getRadiusForVector(p);
        //const r = 1.0;
        p.setLength(r);
        newArray[v + 0] = p.x;
        newArray[v + 1] = p.y;
        newArray[v + 2] = p.z;
        // newPoints.push(p);
      }
      // geometry.setFromPoints(newPoints);
      const newBuffer = new BufferAttribute(
        newArray, positionAtt.itemSize, positionAtt.normalized);
      geometry.setAttribute('position', newBuffer);
      geometry.computeVertexNormals();
      geometry.normalizeNormals();  // smooth normals
      Sphere.geometries[geometryIndex] = geometry;
    }
    const material = new THREE.MeshStandardMaterial({
      color: '#888',
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    super(geometry, material);
    super.castShadow = true;
    super.receiveShadow = true;
  }
}