import * as THREE from "three";
import { BufferAttribute, InterleavedBufferAttribute } from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Random3 } from "./random3";

class Vertex {
  constructor(readonly p: THREE.Vector3, readonly n: THREE.Vector3) { }
  static fromAttributes(vIndex: number,
    positionAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    normalAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Vertex {
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    p.fromBufferAttribute(positionAttribute, vIndex);
    n.fromBufferAttribute(normalAttribute, vIndex);
    return new Vertex(p, n);
  }
}

class Edge {
  private midpoint: Vertex = null;
  private children: Edge[] = null;
  constructor(readonly v1: Vertex, readonly v2: Vertex) {
  }
  getMidpoint(amount: number): Vertex {
    if (this.midpoint) {
      return this.midpoint;
    }
    const mid = new THREE.Vector3();
    mid.lerpVectors(this.v1.p, this.v2.p, 0.5);
    const dv = new THREE.Vector3();
    dv.copy(this.v1.p);
    dv.sub(this.v2.p);
    const oldLength = (this.v1.p.length() + this.v2.p.length()) / 2;
    const totalAmount = amount * dv.length() / oldLength;
    const newLength = oldLength * (1 + totalAmount * (Math.random() - 0.5));
    mid.setLength(newLength);

    const n = new THREE.Vector3();
    n.lerpVectors(this.v1.n, this.v2.n, 0.5);
    this.midpoint = new Vertex(mid, n);
    return this.midpoint;
  }
  getChildren(amount: number): Edge[] {
    if (!this.children) {
      this.children = [];
      this.getMidpoint(amount);
      this.children.push(new Edge(this.v1, this.midpoint));
      this.children.push(new Edge(this.v2, this.midpoint));
    }
    return this.children;
  }

  // Returns the child which starts or ends at v
  // v must be either v1 or v2
  getChild(v: Vertex, amount: number): Edge {
    this.getChildren(amount);
    if (this.children[0].v1 == v) {
      return this.children[0];
    } else if (this.children[1].v1 == v) {
      return this.children[1];
    } else {
      throw new Error('Invalid vertex.');
    }
  }
}

class UVPoint {
  constructor(readonly u: number, readonly v: number) { }
  static midpoint(a: UVPoint, b: UVPoint): UVPoint {
    return new UVPoint((a.u + b.u) / 2, (a.v + b.v) / 2);
  }
  static skySphereMidpoint(a: UVPoint, b: UVPoint): UVPoint {
    if (a.v == 0 || a.v == 1) {
      return new UVPoint(b.u, (a.v + b.v) / 2);
    } else if (b.v == 0 || b.v == 1) {
      return new UVPoint(a.u, (a.v + b.v) / 2);
    } else {
      return new UVPoint((a.u + b.u) / 2, (a.v + b.v) / 2);
    }
  }
  static fromAttribute(att: BufferAttribute | InterleavedBufferAttribute,
    i: number): UVPoint {
    return new UVPoint(att.getX(i), att.getY(i));
  }
}

class Triangle {
  constructor(readonly ab: Edge, readonly bc: Edge, readonly ca: Edge,
    readonly a: Vertex, readonly b: Vertex, readonly c: Vertex,
    readonly auv: UVPoint, readonly buv: UVPoint, readonly cuv: UVPoint) {
  }

  area(): number {
    const ab = new THREE.Vector3();
    ab.copy(this.b.p);
    ab.sub(this.a.p);
    const ac = new THREE.Vector3();
    ac.copy(this.c.p);
    ac.sub(this.a.p);
    ab.cross(ac);
    return ab.length() / 2.0;
  }

  subdivide(amount: number): Triangle[] {
    const result: Triangle[] = [];

    const abVertex = this.ab.getMidpoint(amount);
    const bcVertex = this.bc.getMidpoint(amount);
    const caVertex = this.ca.getMidpoint(amount);
    const abUV = UVPoint.midpoint(this.auv, this.buv);
    const bcUV = UVPoint.midpoint(this.buv, this.cuv);
    const caUV = UVPoint.midpoint(this.cuv, this.auv);

    const aEdge = new Edge(
      this.ab.getMidpoint(amount), this.ca.getMidpoint(amount));
    const bEdge = new Edge(
      this.ab.getMidpoint(amount), this.bc.getMidpoint(amount));
    const cEdge = new Edge(
      this.bc.getMidpoint(amount), this.ca.getMidpoint(amount));

    result.push(
      new Triangle(aEdge, bEdge, cEdge,
        caVertex, abVertex, bcVertex,
        caUV, abUV, bcUV));
    result.push(
      new Triangle(
        this.ab.getChild(this.a, amount),
        aEdge,
        this.ca.getChild(this.a, amount),
        this.a, abVertex, caVertex,
        this.auv, abUV, caUV));
    result.push(
      new Triangle(
        this.ab.getChild(this.b, amount),
        this.bc.getChild(this.b, amount),
        bEdge,
        abVertex, this.b, bcVertex,
        abUV, this.buv, bcUV));
    result.push(
      new Triangle(
        cEdge,
        this.bc.getChild(this.c, amount),
        this.ca.getChild(this.c, amount),
        caVertex, bcVertex, this.c,
        caUV, bcUV, this.cuv));

    return result;
  }
}

export class Fractaline extends THREE.BufferGeometry {
  private triangles: Triangle[] = [];

  constructor() {
    super();
  }

  private static zigZag(x: number): number {
    if (x >= 0) {
      return x * 2;
    } else {
      return -x * 2 + 1;
    }
  }

  static xyzKey(x: number, y: number, z: number): number {
    let xInt = Fractaline.zigZag(Math.round(x * 100));
    let yInt = Fractaline.zigZag(Math.round(y * 100));
    let zInt = Fractaline.zigZag(Math.round(z * 100));

    const biggest = Math.max(xInt, yInt, zInt);
    let inBit = 1;
    let outBit = 1;
    let result = 0;
    while (inBit <= biggest) {
      if (inBit & zInt) {
        result |= outBit;
      }
      outBit = outBit << 1;
      if (inBit & yInt) {
        result |= outBit;
      }
      outBit = outBit << 1;
      if (inBit & xInt) {
        result |= outBit;
      }
      outBit = outBit = outBit << 1;
      inBit = inBit << 1;
    }
    return result;
  }

  static xyzKeyFromAttribute(i: number,
    positionAttribute: BufferAttribute | InterleavedBufferAttribute): number {
    const key = this.xyzKey(positionAttribute.getX(i),
      positionAttribute.getY(i), positionAttribute.getZ(i));
    return key;
  }

  static vuvKey(v: Vertex, uv: UVPoint): string {
    const vKey = this.xyzKey(v.p.x, v.p.y, v.p.z);
    const uvKey = this.xyzKey(uv.u, uv.v, 0);
    return `${vKey}:${uvKey}`;
  }

  static findOrAddVertex(
    i: number,
    positionAttribute: BufferAttribute | InterleavedBufferAttribute,
    normalAttribute: BufferAttribute | InterleavedBufferAttribute,
    baseVertices: Map<number, Vertex>): Vertex {
    const key = this.xyzKeyFromAttribute(i, positionAttribute);
    if (!baseVertices.has(key)) {
      const v = Vertex.fromAttributes(i,
        positionAttribute, normalAttribute);
      baseVertices.set(key, v);
    }
    return baseVertices.get(key);
  }

  static fromBufferGeometry(baseGeometry: THREE.BufferGeometry): Fractaline {
    const baseVertices = new Map<number, Vertex>();
    const baseEdgeIndex = new Map<string, Edge>();

    const result = new Fractaline();
    if (!baseGeometry.index) {
      baseGeometry = BufferGeometryUtils.mergeVertices(baseGeometry, 0.001);
    }
    const positionAttribute = baseGeometry.getAttribute('position');
    const normalAttribute = baseGeometry.getAttribute('normal');
    const uvAttribute = baseGeometry.getAttribute('uv');
    if (positionAttribute.count != normalAttribute.count) {
      throw new Error("Normal and Postions don't match");
    }
    if (positionAttribute.count != uvAttribute.count) {
      throw new Error("UV and Postions don't match");
    }
    for (let i = 0; i < positionAttribute.count; ++i) {
      this.findOrAddVertex(i, positionAttribute, normalAttribute, baseVertices);
    }
    const index = baseGeometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const aIndex = index.getX(i);
      const bIndex = index.getX(i + 1);
      const cIndex = index.getX(i + 2);
      const aKey = this.xyzKeyFromAttribute(aIndex, positionAttribute);
      const bKey = this.xyzKeyFromAttribute(bIndex, positionAttribute);
      const cKey = this.xyzKeyFromAttribute(cIndex, positionAttribute);

      const abEdge = result.findOrMakeBaseEdge(
        aKey, bKey, baseEdgeIndex, baseVertices);
      const bcEdge = result.findOrMakeBaseEdge(
        bKey, cKey, baseEdgeIndex, baseVertices);
      const caEdge = result.findOrMakeBaseEdge(
        cKey, aKey, baseEdgeIndex, baseVertices);
      const tri = new Triangle(abEdge, bcEdge, caEdge,
        baseVertices.get(aKey), baseVertices.get(bKey),
        baseVertices.get(cKey),
        UVPoint.fromAttribute(uvAttribute, aIndex),
        UVPoint.fromAttribute(uvAttribute, bIndex),
        UVPoint.fromAttribute(uvAttribute, cIndex),
      );
      result.triangles.push(tri);
    }

    result.updateGeometry();
    return result;
  }

  subdivide(amount: number, minArea: number = 0) {
    const newTriangles: Triangle[] = [];
    for (const t of this.triangles) {
      if (t.area() < minArea) {
        newTriangles.push(t);
        continue;
      }
      for (const newTri of t.subdivide(amount)) {
        newTriangles.push(newTri);
      }
    }
    this.triangles = newTriangles;
  }

  subdivideVsWorldPoint(p: THREE.Vector3, refArea: number) {
    const d = new THREE.Vector3();
    const newTriangles: Triangle[] = [];
    for (const t of this.triangles) {
      d.copy(t.a.p);
      d.sub(p);
      const minArea = refArea * d.length();
      if (t.area() < minArea) {
        newTriangles.push(t);
        continue;
      }
      for (const newTri of t.subdivide(null)) {
        newTriangles.push(newTri);
      }
    }
    this.triangles = newTriangles;
  }

  updateGeometry(): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const index: number[] = [];
    const uvs: number[] = [];

    const vuvToIndex = new Map<string, number>();
    for (const tri of this.triangles) {
      const aIndex = this.getOrSetIndex(
        tri.a, tri.auv, vuvToIndex, positions, normals, uvs);
      const bIndex = this.getOrSetIndex(
        tri.b, tri.buv, vuvToIndex, positions, normals, uvs);
      const cIndex = this.getOrSetIndex(
        tri.c, tri.cuv, vuvToIndex, positions, normals, uvs);
      index.push(aIndex, bIndex, cIndex);
    }

    this.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(positions), 3, false));
    this.setAttribute('normal',
      new THREE.BufferAttribute(new Float32Array(normals), 3, false));
    this.setAttribute('uv',
      new THREE.BufferAttribute(new Float32Array(uvs), 2, false));
    this.setIndex(index);
    this.computeVertexNormals();
    this.getAttribute('position').needsUpdate = true;
    this.getAttribute('normal').needsUpdate = true;
    this.getAttribute('uv').needsUpdate = true;
  }

  private getOrSetIndex(v: Vertex, uv: UVPoint, m: Map<string, number>,
    positions: number[], normals: number[], uvs: number[]): number {
    const key: string = Fractaline.vuvKey(v, uv);
    if (!m.has(key)) {
      m.set(key, m.size);
      positions.push(v.p.x, v.p.y, v.p.z);
      normals.push(v.n.x, v.n.y, v.n.z);
      uvs.push(uv.u, uv.v);
    }
    return m.get(key);
  }

  private findOrMakeBaseEdge(key1: number, key2: number,
    baseEdgeIndex: Map<string, Edge>,
    baseVertices: Map<number, Vertex>) {
    const key = key1 < key2 ? `${key1}.${key2}` : `${key2}.${key1}`;
    if (!baseEdgeIndex.has(key)) {
      const edge = new Edge(baseVertices.get(key1), baseVertices.get(key2));
      baseEdgeIndex.set(key, edge);
    } else {
    }
    return baseEdgeIndex.get(key);
  }

  private static fromGroupHelper(o: THREE.Object3D, geometries: THREE.BufferGeometry[]) {
    if (o instanceof THREE.Mesh) {
      let parent: THREE.Object3D = o;
      const geometry = o.geometry.clone();
      while (parent != null) {
        geometry.applyMatrix4(parent.matrix);
        parent = parent.parent;
      }
      geometries.push(geometry);
    }
    for (const c of o.children) {
      this.fromGroupHelper(c, geometries);
    }
  }

  static fromGroup(scene: THREE.Scene | THREE.Group,
    merge: boolean): Fractaline {
    const geometries: THREE.BufferGeometry[] = [];
    Fractaline.fromGroupHelper(scene, geometries);
    let geometry: THREE.BufferGeometry =
      BufferGeometryUtils.mergeBufferGeometries(geometries);
    if (merge) {
      geometry = BufferGeometryUtils.mergeVertices(geometry, 0.001);
    }
    geometry.computeVertexNormals();
    return Fractaline.fromBufferGeometry(geometry);
  }
}