import * as THREE from "three";

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LoadOptions, Model } from "./model";

export class AirLock {
  constructor(container: THREE.Group) {
    Model.Load('model/airlock.gltf', new LoadOptions(true)
    ).then((m) => container.add(m.scene));
  }
}