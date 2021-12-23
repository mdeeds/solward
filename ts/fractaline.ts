import * as THREE from "three";
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
  getMidpoint(r: Random3): Vertex {
    if (this.midpoint) {
      return this.midpoint;
    }
    const mid = new THREE.Vector3();
    mid.lerpVectors(this.v1.p, this.v2.p, 0.5);
    const out = new THREE.Vector3();
    out.lerpVectors(this.v1.n, this.v2.n, 0.5);
    const v = new THREE.Vector3();
    v.copy(this.v1.p);
    v.sub(this.v2.p);
    const length = v.length();
    out.multiplyScalar(0.3 * length * (Math.random() - 0.5));
    mid.add(out);
    const n = new THREE.Vector3();
    n.lerpVectors(this.v1.n, this.v2.n, 0.5);
    this.midpoint = new Vertex(mid, n);
    return this.midpoint;
  }
  getChildren(r: Random3): Edge[] {
    if (!this.children) {
      this.children = [];
      this.getMidpoint(r);
      this.children.push(new Edge(this.v1, this.midpoint));
      this.children.push(new Edge(this.v2, this.midpoint));
    }
    return this.children;
  }

  // Returns the child which starts or ends at v
  // v must be either v1 or v2
  getChild(v: Vertex, r: Random3): Edge {
    this.getChildren(r);
    if (this.children[0].v1 == v) {
      return this.children[0];
    } else if (this.children[1].v1 == v) {
      return this.children[1];
    } else {
      throw new Error('Invalid vertex.');
    }
  }
}

class Triangle {
  constructor(readonly ab: Edge, readonly bc: Edge, readonly ca: Edge,
    readonly a: Vertex, readonly b: Vertex, readonly c: Vertex) {
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

  subdivide(random: Random3): Triangle[] {
    const result: Triangle[] = [];

    const abVertex = this.ab.getMidpoint(random);
    const bcVertex = this.bc.getMidpoint(random);
    const caVertex = this.ca.getMidpoint(random);

    const aEdge = new Edge(
      this.ab.getMidpoint(random), this.ca.getMidpoint(random));
    const bEdge = new Edge(
      this.ab.getMidpoint(random), this.bc.getMidpoint(random));
    const cEdge = new Edge(
      this.bc.getMidpoint(random), this.ca.getMidpoint(random));

    result.push(
      new Triangle(aEdge, bEdge, cEdge, caVertex, abVertex, bcVertex));
    result.push(
      new Triangle(
        this.ab.getChild(this.a, random),
        aEdge,
        this.ca.getChild(this.a, random),
        this.a, abVertex, caVertex));
    result.push(
      new Triangle(
        this.ab.getChild(this.b, random),
        this.bc.getChild(this.b, random),
        bEdge,
        abVertex, this.b, bcVertex));
    result.push(
      new Triangle(
        cEdge,
        this.bc.getChild(this.c, random),
        this.ca.getChild(this.c, random),
        caVertex, bcVertex, this.c));

    return result;
  }
}

export class Fractaline extends THREE.BufferGeometry {
  private baseVertices: Vertex[] = [];
  private baseEdgeIndex = new Map<string, Edge>();
  private triangles: Triangle[] = [];

  constructor() {
    super();
  }

  static fromBufferGeometry(baseGeometry: THREE.BufferGeometry): Fractaline {
    const result = new Fractaline();
    if (!baseGeometry.index) {
      baseGeometry = BufferGeometryUtils.mergeVertices(baseGeometry, 0.001);
    }
    const positionAttribute = baseGeometry.getAttribute('position');
    const normalAttribute = baseGeometry.getAttribute('normal');
    if (positionAttribute.count != normalAttribute.count) {
      throw new Error("Normal and Postions don't match");
    }
    for (let i = 0; i < positionAttribute.count; ++i) {
      result.baseVertices.push(Vertex.fromAttributes(i,
        positionAttribute, normalAttribute));
    }
    const index = baseGeometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const aIndex = index.getX(i);
      const bIndex = index.getX(i + 1);
      const cIndex = index.getX(i + 2);
      const abEdge = result.findOrMakeBaseEdge(aIndex, bIndex);
      const bcEdge = result.findOrMakeBaseEdge(bIndex, cIndex);
      const caEdge = result.findOrMakeBaseEdge(cIndex, aIndex);
      const tri = new Triangle(abEdge, bcEdge, caEdge,
        result.baseVertices[aIndex], result.baseVertices[bIndex],
        result.baseVertices[cIndex]);
      result.triangles.push(tri);
    }
    result.updateGeometry();
    return result;
  }

  subdivide(r: Random3, minArea: number) {
    const newTriangles: Triangle[] = [];
    for (const t of this.triangles) {
      if (t.area() < minArea) {
        newTriangles.push(t);
        continue;
      }
      for (const newTri of t.subdivide(r)) {
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

    const vertexToIndex = new Map<Vertex, number>();
    for (const tri of this.triangles) {
      const aIndex = this.getOrSetIndex(tri.a, vertexToIndex, positions, normals);
      const bIndex = this.getOrSetIndex(tri.b, vertexToIndex, positions, normals);
      const cIndex = this.getOrSetIndex(tri.c, vertexToIndex, positions, normals);
      index.push(aIndex, bIndex, cIndex);
    }

    this.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(positions), 3, false));
    this.setAttribute('normal',
      new THREE.BufferAttribute(new Float32Array(normals), 3, false));
    this.setIndex(index);
    this.computeVertexNormals();
    this.getAttribute('position').needsUpdate = true;
    this.getAttribute('normal').needsUpdate = true;
  }

  private getOrSetIndex(v: Vertex, m: Map<Vertex, number>,
    positions: number[], normals: number[]): number {
    if (!m.has(v)) {
      m.set(v, m.size);
      positions.push(v.p.x, v.p.y, v.p.z);
      normals.push(v.n.x, v.n.y, v.n.z);
    }
    return m.get(v);
  }

  private findOrMakeBaseEdge(i1: number, i2: number) {
    const key = i1 < i2 ? `${i1}.${i2}` : `${i2}.${i1}`;
    if (!this.baseEdgeIndex.has(key)) {
      const edge = new Edge(this.baseVertices[i1], this.baseVertices[i2]);
      this.baseEdgeIndex.set(key, edge);
    }
    return this.baseEdgeIndex.get(key);
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