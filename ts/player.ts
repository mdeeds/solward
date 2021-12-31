import * as THREE from "three";
import Ammo from "ammojs-typed";
import { GameEntity } from "./gameEntity";
import { Removeable } from "./spatialHash";
import { Physics } from "./physics";

export class Player extends THREE.Group implements Removeable, GameEntity {
  constructor() {
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