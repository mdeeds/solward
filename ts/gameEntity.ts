import * as THREE from "three";

import { Removeable } from "./spatialHash";

export interface GameEntity extends Removeable {
  getWorldPosition(v: THREE.Vector3): void;
  getRadius(): number;
}