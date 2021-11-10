import * as THREE from "three";
import { GameEntity } from "./gameEntity";
import { Removeable } from "./spatialHash";

export class Player extends THREE.Group implements Removeable, GameEntity {
  constructor(readonly velocity: THREE.Vector3) {
    super();
  }

  tag() {
    this.visible = true;
  }

  removeTag() {
    this.visible = false;
  }

  getObject3D() {
    return this;
  }

  getRadius(): number { return 10; }
}