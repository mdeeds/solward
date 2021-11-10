import * as THREE from "three";

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type ModelCallback = (g: Model) => void;

export class LoadOptions {
  constructor(
    readonly singleSided: boolean) { }
  static default() {
    return new LoadOptions(null);
  }
}

export class Model {
  constructor(readonly scene: THREE.Group, readonly clips: THREE.AnimationClip[]) {
  }

  clone() {
    // Animations don't need to be cloned???
    // const clips: THREE.AnimationClip[] = [];
    // for (const c of this.clips) {
    //   clips.push(c.clone());
    // }
    return new Model(this.scene.clone(), this.clips);
  }

  private getMeshHelper(o: THREE.Object3D, name: string): THREE.Mesh {
    if (o instanceof THREE.Mesh && o.name === name) {
      return o;
    } else {
      for (const c of o.children) {
        const m = this.getMeshHelper(c, name);
        if (m) {
          return m;
        }
      }
    }
    return null;
  }

  getMesh(name: string): THREE.Mesh {
    return this.getMeshHelper(this.scene, name);
  }

  static Load(url: string, options: LoadOptions): Promise<Model> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(url, function (gltf) {
        console.log(`Loaded: ${url}`);
        gltf.scene.traverse((o) => {

          if (o instanceof THREE.Mesh) {
            console.log(` ${o.name}: M`);
            if (options.singleSided != null && options.singleSided &&
              o.material instanceof THREE.Material) {
              o.material.side = THREE.FrontSide;
            }
          } else {
            console.log(` ${o.name}`);
          }
          for (const a of o.animations) {
            console.log(` A: ${a.name}`);
          }
        });
        resolve(new Model(gltf.scene, gltf.animations));
      }, undefined, function (error) {
        reject(error);
      });
    });
  }

  static pending = new Map<string, ModelCallback[]>();
  static cache = new Map<string, Model>();
  static LoadCached(url: string, options: LoadOptions): Promise<Model> {
    if (Model.cache.has(url)) {
      return new Promise<Model>((resolve) => {
        console.log('Hit.');
        resolve(Model.cache.get(url).clone());
      });
    } else if (Model.pending.has(url)) {
      console.log('Pending.');
      return new Promise<Model>(async (resolve) => {
        Model.pending.get(url).push((g: Model) => { resolve(g); });
      });
    } else {
      console.log('Miss.');
      return new Promise<Model>(async (resolve) => {
        Model.pending.set(url, []);
        const model: Model = await Model.Load(url, options);
        Model.cache.set(url, model);
        for (const f of Model.pending.get(url)) {
          console.log('Resolved.');
          f(model.clone());
        }
        Model.pending.delete(url);
        resolve(model.clone());
      });
    }
  }
}