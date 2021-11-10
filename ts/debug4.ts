import * as THREE from "three";
import { Fractaline } from "./fractaline";
import { LoadOptions, Model } from "./model";
import { Random3 } from "./random3";

export class Debug4 {
  constructor() {
    const body = document.querySelector('body');
    const scene = new THREE.Scene();

    var renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    const camera = new THREE.PerspectiveCamera(
      75, 1.0, 0.1, 3000);
    camera.position.set(0, 0, 0);
    renderer.setSize(800, 800);
    body.appendChild(renderer.domElement);
    this.light(scene);

    const clock = new THREE.Clock();
    clock.start();

    const sp = new URL(document.URL).searchParams;
    const modelFile = sp.get('model');
    const z = parseFloat(sp.get('z'));

    const objects: THREE.Object3D[] = [];
    let clips: THREE.AnimationClip[] = null;
    let mixer: THREE.AnimationMixer = null;
    let fractaline: Fractaline = null;
    let fg: THREE.Mesh = null;
    const random = new Random3();

    Model.Load(`model/${modelFile}.gltf`, new LoadOptions(true))
      .then((m: Model) => {
        if (sp.get('fractal')) {
          fractaline = Fractaline.fromGroup(m.scene, true);
          fg = new THREE.Mesh(
            fractaline, new THREE.MeshStandardMaterial({
              color: 0xffffff, metalness: 1.0, roughness: 0.6
            }));
          fg.translateZ(z);
          objects.push(fg);
          scene.add(fg);
        } else {
          const g = m.scene;
          scene.add(g);
          g.translateZ(z);
          objects.push(g);
          clips = m.clips;
          mixer = new THREE.AnimationMixer(m.scene);
        }
        console.log('Loaded.');
      });

    body.addEventListener('keydown', (ev) => {
      if (clips) {
        for (const clip of clips) {
          mixer.clipAction(clip).play();
        }
      }
      if (fractaline && ev.code === 'KeyD') {
        fractaline.subdivide(random, 0.1);
        fractaline.updateGeometry();
      }
      if (fractaline && ev.code === 'KeyS') {
        const p = new THREE.Vector3();
        p.set(parseFloat(sp.get('x')), 0, 0);
        fractaline.subdivideVsWorldPoint(p, parseFloat(sp.get('s')));
        fractaline.updateGeometry();
      }
    });

    renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      const theta = clock.getElapsedTime() / 5;
      renderer.render(scene, camera);
      for (const o of objects) {
        o.rotateX(0.01 * deltaS);
        o.rotateY(0.002 * (1 + Math.sin(theta)));
      }
    });

    console.log('done.');
  }

  light(scene: THREE.Scene) {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 0, 100);
    scene.add(light);
  }
}