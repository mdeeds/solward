import * as THREE from "three";
// import { CSG } from "three-csg-ts";

import { Asteroid } from "./asteroid";
import { Model } from "./model";

export class HomeAsteroid implements Asteroid {
  private group: THREE.Group = new THREE.Group();
  constructor(
    private container: THREE.Group, position: THREE.Vector3) {
    this.group.position.copy(position);
    this.build();
  }

  private async build() {
    const asteroid: Model = await
      Model.Load('model/asteroid.gltf', { singleSided: true });
    this.group.add(asteroid.scene);
    const airlock: Model = await
      Model.Load('model/airlock.gltf', { singleSided: true });
    airlock.scene.position.set(15, 15, -160);
    airlock.scene.rotateY(Math.PI);
    this.group.add(airlock.scene);

    // Super slow :-(
    // const room = CSG.fromMesh(airlock.getMesh('Room'));
    // const surfaceMesh = asteroid.getMesh('Cube');
    // const surface = CSG.fromMesh(surfaceMesh);
    // const modified = surface.subtract(room);
    // const modifiedMesh = modified.toMesh(
    //   this.group.matrixWorld, surfaceMesh.material)
    // this.group.add(modifiedMesh);
  }

  getRadius() {
    return 200;
  }

  getWorldPosition(position: THREE.Vector3) {
    this.group.getWorldPosition(position);
  }

  tick(elapsedS: number) {
  }

  getName(): string {
    return "Refinery 1337";
  }

  getClass(): string {
    return "C-Carbonic Chondrite";
  }

  removeTag() {
    this.container.remove(this.group);
  }

  tag() {
    this.container.add(this.group);
  }
}