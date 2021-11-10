import * as THREE from "three";
import { Path, ToneMapping } from "three";
import { Random3 } from "./random3";

// All Patches are the same resolution, but they may be different sizes.
// I'm starting with a really low resolution because a cube made from
// six of these will be the lowest resolution we have and represent
// asteroids which are far away.  16 vertices per edge = 256 vertices per
// cube face = 1536 vertices.
export class Patch extends THREE.Mesh {
  private static recycleBin: Patch[] = [];
  private static colorList = [
    0x040404, 0x0000ff, 0x00ff00, 0x00ffff,
    0xff0000, 0xff00ff, 0xffff00, 0xffffff];
  private static colorIndex = 0;

  childPatches: Patch[];

  static kSegmentsPerSide = 8;
  static kVerticesPerSide = Patch.kSegmentsPerSide + 1;

  private faceRotation: THREE.Euler;

  // Offset is in face-space: z = 0 and x and y indicate the offset.
  private offset: THREE.Vector3;
  private patchCenter: THREE.Vector3;

  // Width is 2 for a whole cube face.  It represents the entire width of a patch.
  private width: number;

  private random: Random3;

  private depth: number;

  private tmp: THREE.Vector3;

  constructor(faceRotation: THREE.Euler, offset: THREE.Vector3, width: number,
    random: Random3) {
    const geometry = new THREE.PlaneBufferGeometry(
      1, 1, Patch.kSegmentsPerSide, Patch.kSegmentsPerSide);

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 1.0,
      roughness: 0.6,
      // side: THREE.DoubleSide
    });

    geometry.translate(0, 0, 1);
    geometry.rotateX(faceRotation.x);
    geometry.rotateY(faceRotation.y);
    geometry.rotateZ(faceRotation.z);

    super(geometry, material);
    if (new URL(document.URL).searchParams.get('triangles')) {
      super.add(new THREE.Line(geometry,
        new THREE.LineBasicMaterial({ color: 0x0000ff })));
    }

    this.faceRotation = faceRotation;
    this.offset = offset;
    this.width = width;
    this.random = random;
    this.childPatches = null;
    this.patchCenter = new THREE.Vector3();
    this.depth = 0;
    this.tmp = new THREE.Vector3();
  }


  static minDistance = 10000;

  // Given a world position of the camera
  // updates resolution of this patch and children as appropriate.
  updateResolution(position: THREE.Vector3, group: THREE.Group) {
    const p = new THREE.Vector3();
    p.copy(this.patchCenter);
    let parent: THREE.Object3D = group;
    let scale = 1;
    while (parent != null) {
      p.applyMatrix4(parent.matrix);
      scale *= parent.scale.x;
      parent = parent.parent;
    }
    p.sub(position);
    const distance = p.length();
    // Target resolution is 0.1 radians per segment.
    // theta < segment length / distance
    // theta < width / segmentsPerSide / distance
    const theta = scale * this.width /
      Patch.kSegmentsPerSide / distance;
    // if (distance < Patch.minDistance) {
    //   Patch.minDistance = distance;
    //   console.log(`Distance: ${distance}; Theta: ${theta}`);
    // }
    if (theta > 0.06) {
      if (this.depth > 4) {
        return;
      }
      // subdivide
      if (!this.childPatches) {
        // Need to make patches
        group.remove(this);
        for (const p of this.subdivide()) {
          group.add(p);
        }
      }
      for (const p of this.childPatches) {
        p.updateResolution(position, group);
      }
    } else if (theta <= 0.04) {
      // Merge
      if (!!this.childPatches) {
        for (const p of this.childPatches) {
          group.remove(p);
          p.recycle();
          p.updateResolution(position, group);
        }
        group.add(this);
        this.childPatches = null;
      }
    }
  }

  private recycle() {
    if (this.childPatches) {
      for (const c of this.childPatches) {
        c.recycle();
      }
    }
    Patch.recycleBin.push(this);
  }

  private setSeed(name: string) {
    this.random = new Random3();
  }

  private setIndex() {
    const indices = [];
    for (let i = 0; i < Patch.kSegmentsPerSide; i++) {
      for (let j = 0; j < Patch.kSegmentsPerSide; j++) {
        indices.push(
          i * (Patch.kVerticesPerSide) + j,
          (i + 1) * (Patch.kVerticesPerSide) + j + 1,
          i * (Patch.kVerticesPerSide) + j + 1);
        indices.push(
          i * (Patch.kVerticesPerSide) + j,
          (i + 1) * (Patch.kVerticesPerSide) + j,
          (i + 1) * (Patch.kVerticesPerSide) + j + 1);
      }
    }
    this.geometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(indices), 1));
  }

  // Divides this patch into four patches which cover this one.
  // Note: Does not apply shrink wrap.  A patch may be recycled.  The geometry
  // of the patch returned can be anything.
  subdivide(): Patch[] {
    if (this.childPatches) {
      return this.childPatches;
    }
    this.childPatches = [];
    while (this.childPatches.length < 4 && Patch.recycleBin.length > 0) {
      const p = Patch.recycleBin.pop();
      this.childPatches.push();
    }
    while (this.childPatches.length < 4) {
      this.childPatches.push(
        new Patch(this.faceRotation, this.offset, this.width, null));
    }
    for (let i = 0; i < 4; ++i) {
      this.childPatches[i].faceRotation = this.faceRotation;
      this.childPatches[i].width = this.width / 2;
      this.childPatches[i].setSeed(`${this.name}${i}`);
      this.childPatches[i].depth = this.depth + 1;
      const material = this.childPatches[i].material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.setHex(Patch.colorList[
          (Patch.colorIndex++) % Patch.colorList.length]);
      }
    }
    const quarter = this.width / 4;
    this.childPatches[0].offset.set(this.offset.x - quarter, this.offset.y - quarter, 0);
    this.childPatches[1].offset.set(this.offset.x + quarter, this.offset.y - quarter, 0);
    this.childPatches[2].offset.set(this.offset.x - quarter, this.offset.y + quarter, 0);
    this.childPatches[3].offset.set(this.offset.x + quarter, this.offset.y + quarter, 0);

    const midVertexIndex = Patch.kSegmentsPerSide / 2;
    this.childPatches[0].copySubmesh(this, 0, 0);
    this.childPatches[1].copySubmesh(this, midVertexIndex, 0);
    this.childPatches[2].copySubmesh(this, 0, midVertexIndex);
    this.childPatches[3].copySubmesh(this, midVertexIndex, midVertexIndex);
    return this.childPatches;
  }

  private copySubmesh(source: Patch, iStart: number, jStart: number) {
    // All Start/End numbers are inclusive.
    const iEnd = iStart + (Patch.kVerticesPerSide - 1) / 2;
    const jEnd = jStart + (Patch.kVerticesPerSide - 1) / 2;
    const tmp1 = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const sourcePosition = source.geometry.getAttribute('position');
    const targetPosition = this.geometry.getAttribute('position');
    for (let iSource = iStart; iSource <= iEnd; ++iSource) {
      const iTarget = (iSource - iStart) * 2;
      for (let jSource = jStart; jSource <= jEnd; ++jSource) {
        const jTarget = (jSource - jStart) * 2;
        const sourceIndex = jSource + iSource * Patch.kVerticesPerSide;
        const targetIndex = jTarget + iTarget * Patch.kVerticesPerSide;
        if (sourceIndex > sourcePosition.count) {
          throw new Error('Out of range in source.');
        }
        if (targetIndex > sourcePosition.count) {
          throw new Error('Out of range in target.');
        }
        tmp1.fromBufferAttribute(sourcePosition, sourceIndex);
        if (tmp1.length() === 0) {
          throw new Error('Missing source value');
        }
        targetPosition.setXYZ(targetIndex, tmp1.x, tmp1.y, tmp1.z);
      }
    }
    // Iterpolate even rows
    // We work every other row, interpolating the points at 
    // even indexes to make the value at the odd index.
    for (let i = 1; i < Patch.kVerticesPerSide; i += 2) {
      for (let j = 0; j < Patch.kVerticesPerSide; j += 2) {
        const vertexIndex = j + i * Patch.kVerticesPerSide;
        tmp1.fromBufferAttribute(
          targetPosition, vertexIndex - Patch.kVerticesPerSide);
        tmp2.fromBufferAttribute(
          targetPosition, vertexIndex + Patch.kVerticesPerSide);
        tmp1.lerp(tmp2, 0.5);
        targetPosition.setXYZ(vertexIndex, tmp1.x, tmp1.y, tmp1.z);
        if (tmp1.length() === 0) {
          throw new Error('zero interpolation');
        }
      }
    }

    // Interpolate odd rows
    // Now that we have complete odd rows, we can interpolate every 
    // point to get the even rows
    for (let i = 0; i < Patch.kVerticesPerSide; ++i) {
      for (let j = 1; j < Patch.kVerticesPerSide; j += 2) {
        const vertexIndex = j + i * Patch.kVerticesPerSide;
        tmp1.fromBufferAttribute(
          targetPosition, vertexIndex - 1);
        tmp2.fromBufferAttribute(
          targetPosition, vertexIndex + 1);
        tmp1.lerp(tmp2, 0.5);
        targetPosition.setXYZ(vertexIndex, tmp1.x, tmp1.y, tmp1.z);
        if (tmp1.length() === 0) {
          throw new Error('zero interpolation');
        }
      }
    }
    targetPosition.needsUpdate = true;
    this.geometry.setAttribute('position', targetPosition);
    // Finally, add noise as a source of random detail.
    this.noise();  // TODO
    this.setIndex();

    let normalAttribute = this.geometry.getAttribute('normal');
    if (!normalAttribute) {
      normalAttribute = new THREE.BufferAttribute(
        new Float32Array(sourcePosition.count * 3), 3);
    }
    Patch.computeVertexNormals(targetPosition, normalAttribute, this.geometry);

    this.patchCenter.fromBufferAttribute(targetPosition,
      Patch.kSegmentsPerSide / 2 +
      Patch.kVerticesPerSide * Patch.kSegmentsPerSide / 2);
    // this.setEdgeNormals();
    this.geometry.setAttribute('normal', normalAttribute);
    normalAttribute.needsUpdate = true;
  }

  private setEdgeNormals() {
    const positionsAttribute = this.geometry.getAttribute('position');
    const normalAttribute = this.geometry.getAttribute('normal');
    for (let i = 0; i < Patch.kVerticesPerSide; ++i) {
      this.setNormal(positionsAttribute, normalAttribute, i);
      this.setNormal(positionsAttribute, normalAttribute,
        i + Patch.kSegmentsPerSide);
      this.setNormal(positionsAttribute, normalAttribute,
        i * Patch.kVerticesPerSide);
      this.setNormal(positionsAttribute, normalAttribute,
        (i + Patch.kSegmentsPerSide) * Patch.kVerticesPerSide);
    }
    normalAttribute.needsUpdate = true;
    this.geometry.setAttribute('normal', normalAttribute);
  }

  private setNormal(
    positionsAttribute:
      THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    normalAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    index: number) {
    this.tmp.fromBufferAttribute(positionsAttribute, index);
    this.tmp.normalize();
    normalAttribute.setXYZ(index, this.tmp.x, this.tmp.y, this.tmp.z);
  }

  // Scales this patch to a square the size specified, places it
  // at patchPosition, and then uses a raycaster to transfer
  // the geometry of `other` to this patch.
  shrinkWrap(other: THREE.Mesh, scale: number) {
    const otherCenter = new THREE.Vector3();
    if (other.material instanceof THREE.Material) {
      other.material.side = THREE.DoubleSide;
    }
    other.getWorldPosition(otherCenter);
    const raycaster = new THREE.Raycaster();

    // Liberally copied from 
    // https://github.com/simondevyoutube/ProceduralTerrain_Part4/blob/master/src/terrain-chunk.js

    const _D = new THREE.Vector3();
    const _D1 = new THREE.Vector3();
    const _D2 = new THREE.Vector3();
    const _P = new THREE.Vector3();
    const _H = new THREE.Vector3();
    const _W = new THREE.Vector3();

    const positions = [];
    const colors = [];
    const uvs = [];

    const localToWorld = other.matrixWorld;
    const resolution = Patch.kSegmentsPerSide;
    const radius = 1; // this._params.radius;
    const half = this.width / 2;

    const intersections = [];
    let maxHeight = 0;
    for (let x = 0; x <= resolution; x++) {
      const xp = this.width * x / resolution;
      for (let y = 0; y <= resolution; y++) {
        const yp = this.width * y / resolution;

        // Compute position
        _P.set(xp - half, yp - half, radius);
        _P.applyEuler(this.faceRotation);
        _P.normalize();
        _D.copy(_P);
        _P.multiplyScalar(radius);
        _P.z -= radius;

        // Compute a world space position to sample noise
        _W.copy(_P);
        _W.applyMatrix4(localToWorld);

        raycaster.set(otherCenter, _D);
        intersections.splice(0);
        raycaster.intersectObject(other, true, intersections);
        const height =
          scale * intersections[intersections.length - 1].distance ?? 1;
        // const height = 1.0;
        maxHeight = Math.max(height, maxHeight);
        const color = { r: 0.5, g: 0.5, b: 0.5 };

        // Purturb height along z-vector
        _H.copy(_D);
        _H.multiplyScalar(height);
        // _P.add(_H);
        _P.copy(_H);
        positions.push(_P.x, _P.y, _P.z);
        colors.push(color.r, color.g, color.b);
        uvs.push(x / resolution, y / resolution);
      }
    }

    const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
    this.geometry.setAttribute('position', positionAttribute);
    positionAttribute.needsUpdate = true;
    this.setIndex();

    this.patchCenter.fromBufferAttribute(positionAttribute,
      Patch.kSegmentsPerSide / 2 +
      Patch.kVerticesPerSide * Patch.kSegmentsPerSide / 2);

    let normalAttribute = this.geometry.getAttribute('normal');
    if (!normalAttribute) {
      normalAttribute = new THREE.BufferAttribute(
        new Float32Array(positionAttribute.count * 3), 3);
    }
    Patch.computeVertexNormals(positionAttribute, normalAttribute, this.geometry);
    this.geometry.setAttribute('normal', normalAttribute);
    normalAttribute.needsUpdate = true;
  }

  noiseAll() {
    this.noise(true);
  }

  // Applies noise to all odd-numbered verticies.
  private noise(all = false) {
    const noiseVector = new THREE.Vector3();
    let totalNoise = 0;
    let noiseCount = 0;
    const tmp = new THREE.Vector3();
    const positionAttribute = this.geometry.getAttribute('position');
    for (let i = 0; i < Patch.kVerticesPerSide; ++i) {
      for (let j = 0; j < Patch.kVerticesPerSide; ++j) {
        let vIndex = (j + i * Patch.kVerticesPerSide);
        tmp.fromBufferAttribute(positionAttribute, vIndex);
        if (all || j % 2 === 1 || i % 2 === 1) {
          noiseVector.copy(tmp);
          noiseVector.normalize();
          const noise = (2 * this.random.get(
            noiseVector.x, noiseVector.y, noiseVector.z) - 1) /
            (this.depth + 1);

          totalNoise += noise;
          ++noiseCount;
          noiseVector.multiplyScalar(0.5 * this.width / Patch.kSegmentsPerSide);
          noiseVector.multiplyScalar(noise);
          tmp.add(noiseVector);
          positionAttribute.setXYZ(vIndex, tmp.x, tmp.y, tmp.z);
        }
      }
    }
    this.geometry.setAttribute('position', positionAttribute);
  }

  static computeVertexNormals(
    positionAttribute:
      THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    normalAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    geometry: THREE.BufferGeometry) {
    const index = geometry.index;
    if (!index) {
      throw new Error(`${geometry.uuid} No index!`)
    }

    for (let i = 0, il = normalAttribute.count; i < il; i++) {
      normalAttribute.setXYZ(i, 0, 0, 0);
    }

    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
    const nA = new THREE.Vector3(), nB = new THREE.Vector3(), nC = new THREE.Vector3();
    const cb = new THREE.Vector3(), ab = new THREE.Vector3();

    // indexed elements
    for (let i = 0, il = index.count; i < il; i += 3) {

      const vA = index.getX(i + 0);
      const vB = index.getX(i + 1);
      const vC = index.getX(i + 2);

      pA.fromBufferAttribute(positionAttribute, vA);
      pB.fromBufferAttribute(positionAttribute, vB);
      pC.fromBufferAttribute(positionAttribute, vC);

      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);

      nA.fromBufferAttribute(normalAttribute, vA);
      nB.fromBufferAttribute(normalAttribute, vB);
      nC.fromBufferAttribute(normalAttribute, vC);

      nA.add(cb);
      nB.add(cb);
      nC.add(cb);

      normalAttribute.setXYZ(vA, nA.x, nA.y, nA.z);
      normalAttribute.setXYZ(vB, nB.x, nB.y, nB.z);
      normalAttribute.setXYZ(vC, nC.x, nC.y, nC.z);

    }

    for (let i = 0, il = normalAttribute.count; i < il; i++) {
      pA.fromBufferAttribute(normalAttribute, i);
      pA.normalize();
      normalAttribute.setXYZ(i, pA.x, pA.y, pA.z);
    }

    normalAttribute.needsUpdate = true;
  }
}