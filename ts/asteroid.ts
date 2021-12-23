import * as THREE from "three";

import { GameEntity } from "./gameEntity";
import { LoadOptions, Model } from "./model";
import { PatchCube } from "./patchCube";
import { Random } from "./random";
import { Ticker } from "./ticker";

export interface Asteroid extends GameEntity, Ticker {
  getName(): string;
  getClass(): string;
  removeTag(): void;
  tag(): void;
}

class PCubeAsteroid implements Asteroid {
  readonly group: THREE.Group = new THREE.Group();
  private wrapped = false;
  private pCube: PatchCube;
  private name: string;
  constructor(private radius: number, position: THREE.Vector3,
    private container: THREE.Group | THREE.Scene, camera: THREE.Camera) {
    this.pCube = new PatchCube('', camera);
    this.group.add(this.pCube);
    this.group.position.copy(position);
    this.group.scale.set(radius, radius, radius);
  }

  getName() {
    return "PatchCube";
  }

  getClass() {
    return "PatchCubeClass"
  }

  removeTag() {
    this.container.remove(this.group);
  }

  tag() {
    if (!this.wrapped) {
      const geometry = new THREE.IcosahedronBufferGeometry(2);
      const material = new THREE.MeshStandardMaterial();
      this.pCube.shrinkWrap(new THREE.Mesh(geometry, material));
      this.pCube.noiseAll();
      this.pCube.bake();
      this.wrapped = true;
    }
    this.container.add(this.group);
  }

  getRadius() {
    return this.radius;
  }

  bake() {
    this.pCube.bake();
  }

  getWorldPosition(position: THREE.Vector3) {
    this.group.getWorldPosition(position);
  }

  tick(elapsedS: number) {
    if (this.wrapped) {
      this.pCube.tick(elapsedS);
    }
  }
}

export class InstancedAsteroid implements Asteroid {
  private name: string;
  private class: string = 'instanced';
  private index: number;
  constructor(position: THREE.Vector3, private radius: number,
    private instancedMesh: THREE.InstancedMesh) {
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    dummy.scale.set(radius, radius, radius);
    dummy.updateMatrix();
    this.index = instancedMesh.count;
    instancedMesh.count++;
    instancedMesh.setMatrixAt(this.index, dummy.matrix);
    this.name = `${instancedMesh.name}-${this.index}`;
  }

  getName() {
    return this.name;
  }

  getClass() {
    return this.class;
  }

  removeTag() {
    // this.container.remove(this.group);
  }

  tag() {
    // this.container.add(this.group);
  }

  getRadius() {
    return this.radius;
  }

  getWorldPosition(position: THREE.Vector3) {
    this.instancedMesh.updateWorldMatrix(false, false);
    const matrix = new THREE.Matrix4();
    this.instancedMesh.getMatrixAt(this.index, matrix);
    position.setFromMatrixPosition(matrix);
    position.applyMatrix4(this.instancedMesh.matrixWorld);
  }
  tick(elapsedS: number) {
  }
}

export class ModelAsteroid implements Asteroid {
  readonly group: THREE.Group = new THREE.Group();

  static layout = new Random('layout');
  private class: string;

  constructor(private radius: number, position: THREE.Vector3,
    private container: THREE.Group | THREE.Scene, camera: THREE.Camera,
    modelFile: string, private name: string) {
    this.group.position.copy(position);
    this.group.scale.set(radius, radius, radius);

    Model.LoadCached(modelFile, new LoadOptions(true)).then((g) => {
      this.group.add(g.scene);
    });
    this.class = modelFile;
  }

  static makeRandom(radius: number, position: THREE.Vector3,
    container: THREE.Group | THREE.Scene, camera: THREE.Camera,
    name: string) {
    const modelFile =
      `model/asteroid${Math.floor(ModelAsteroid.layout.next() * 10 + 1)}.gltf`;
    return new ModelAsteroid(radius, position, container, camera,
      modelFile, name);
  }

  getName() {
    return this.name;
  }

  getClass() {
    return this.class;
  }

  removeTag() {
    this.container.remove(this.group);
  }

  tag() {
    this.container.add(this.group);
  }

  getRadius() {
    return this.radius;
  }

  bake() {
    throw new Error('Not implemented');
  }

  getWorldPosition(position: THREE.Vector3) {
    this.group.getWorldPosition(position);
  }

  tick(elapsedS: number) {
  }
}