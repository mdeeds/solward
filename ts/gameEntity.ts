import * as THREE from "three";

import { Removeable } from "./spatialHash";

export interface GameEntity extends Removeable {
  getObject3D(): THREE.Object3D;
  getRadius(): number;
}