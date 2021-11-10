import * as THREE from "three";

import { AirLock } from "./airLock";
import { Random } from "./random";
import { Ticker } from "./ticker";
import { LandingGuide } from "./landingGuide";
import { Asteroid, ModelAsteroid } from "./asteroid";
import { SpatialClient, SpatialHash } from "./spatialHash";
import { Player } from "./player";
import { GameEntity } from "./gameEntity";
import { SkySphere } from "./skySphere";
import { Sample } from "./sample";
import { GeometryUtils } from "./geometryUtils";
import { Mission, Mission1 } from "./mission";
import { LoadOptions, Model } from "./model";
import { Fractaline } from "./fractaline";
import { HomeAsteroid } from "./home";

export class Field implements Ticker {

  private bodies = new SpatialHash<GameEntity>(3000);
  private smallBodies = new SpatialHash<GameEntity>(3000);
  private landingGuide = new LandingGuide();

  private playerClient: SpatialClient<GameEntity>;
  private mission: Mission;
  constructor(private system: THREE.Group,
    private player: Player,
    scene: THREE.Scene | THREE.Group, private camera: THREE.Camera) {

    this.mission = new Mission1();
    const initialPosition = this.mission.getInitialPlayerPosition();
    initialPosition.multiplyScalar(-1);
    this.system.position.copy(initialPosition);
    this.player.rotation.copy(this.mission.getInitialRotation());
    this.playerClient = this.bodies.newClient(
      player.getObject3D().position, player.getRadius(), player)

    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(0, SkySphere.kRadius / 2, 0);
    light.target.position.set(0, 0, 0);
    // light.shadow.mapSize.width = 2048
    // light.shadow.mapSize.height = 2048

    // light.shadow.camera.left = -100;
    // light.shadow.camera.right = 100;
    // light.shadow.camera.top = 100;
    // light.shadow.camera.bottom = -100;

    // light.shadow.camera.near = SkySphere.kRadius / 2 - 1000;
    // light.shadow.camera.far = SkySphere.kRadius / 2 + 1000;
    // light.castShadow = true;
    const sb = new URL(document.URL).searchParams.get('sb');
    if (sb) {
      light.shadow.bias = parseFloat(sb);
      console.log(light.shadow.bias);
    } else {
      light.shadow.bias = -0.001;
    }
    scene.add(light);

    const headlamp = new THREE.PointLight(0xfffffff, 1.0, 30, 2);
    player.add(headlamp);

    {
      const sunRadius = 695700;
      const sunDistanceToPlayer = 2 * 1.496e8;
      const r = sunRadius / sunDistanceToPlayer * SkySphere.kRadius;

      const loader = new THREE.TextureLoader();
      loader.load(
        'img/sun.jpg',
        function (texture) {
          console.log('loaded sun');
          const sunGeometry = new THREE.PlaneGeometry(r * 10, r * 10);
          const sunMaterial = new THREE.MeshBasicMaterial({
            map: texture
          });
          const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
          sunMesh.position.set(0, SkySphere.kRadius / 2, 0);
          sunMesh.rotation.set(0, Math.PI / 2, 0);
          scene.add(sunMesh);
        });
    }

    const posRandom = new Random('positions');
    // system.add(
    //   new Octohedron(30, 100,
    //     new Random('home'), new THREE.Vector3(0, -30, -10)).getMesh());

    const homePosition = new THREE.Vector3(0, 0, 160);
    const home = new HomeAsteroid(system, homePosition);
    this.bodies.newClient(homePosition, 200, home);

    const num = new URL(document.URL).searchParams.get('n');
    let numAsteroids = 300;
    if (num) {
      numAsteroids = parseInt(num);
    }
    let numSmall = 0;
    for (let i = 0; i < numAsteroids; ++i) {
      const range = 80000;
      const r = 100 * posRandom.next() + 5;
      const position = new THREE.Vector3(
        (posRandom.next() - 0.5) * range,
        (posRandom.next() - 0.5) * range,
        (posRandom.next() - 0.5) * range);
      const a = ModelAsteroid.makeRandom(r, position, system, camera,
        `A-${i}`);
      this.bodies.newClient(position, r, a);
      numSmall += this.addSamples(posRandom, position, a, r, system);
    }
    console.log(`Num small: ${numSmall}`);

    {
      const position = new THREE.Vector3(30, 0, -100);
      const nearby = new ModelAsteroid(20, position, system, camera,
        'model/asteroid1.gltf', 'Junk-R');
      this.bodies.newClient(position, 40, nearby);
      const n = this.addSamples(posRandom, position, nearby, 20, system);
      console.log(`Added: ${n}`);
    }
    if (new URL(document.URL).searchParams.get('f')) {
      Model.Load(`model/asteroid2.gltf`, new LoadOptions(true))
        .then((m: Model) => {
          const fractaline = Fractaline.fromGroup(m.scene, false);
          console.log(`${window.performance.now().toFixed(3)} before`);
          fractaline.subdivide(null, 0.1);
          console.log(`${window.performance.now().toFixed(3)} one done`);
          fractaline.subdivide(null, 0.1);
          console.log(`${window.performance.now().toFixed(3)} two done`);
          console.log(`${window.performance.now().toFixed(3)} built`);
          const mesh = new THREE.Mesh(
            fractaline, new THREE.MeshStandardMaterial({
              color: 0xffffff, metalness: 1.0, roughness: 0.6
            }));
          mesh.position.set(-30, 0, -100);
          mesh.scale.set(30, 30, 30);
          system.add(mesh);
        });
    }
    // Model.Load('model/landing-rig.gltf').then((m) => player.add(m));;
    player.add(this.landingGuide);
  }

  private asteroidWorld = new THREE.Vector3();
  private cameraWorld = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private raycaster = new THREE.Raycaster()
  private lastUpdateS: number = 0;

  tick(elapsedS: number, deltaS: number) {
    if (elapsedS - this.lastUpdateS < 0.03) {
      return;
    }
    this.lastUpdateS = elapsedS;
    this.camera.getWorldPosition(this.cameraWorld);
    let minScore: number = null;
    let minDistance: number = null;
    let closestAsteroid: Asteroid = null;
    let frontAsteroid: Asteroid = null;
    this.tmp.copy(this.cameraWorld);
    this.tmp.sub(this.system.position);
    let bestCosine = 0;
    const small = this.smallBodies.tag(this.tmp, 10000);
    const closeBodies = this.bodies.tag(this.tmp, 20000);
    for (const o of closeBodies) {
      o.getObject3D().getWorldPosition(this.tmp);
      const r = this.tmp.length();
      const forward = new THREE.Vector3(0, 0, -1);
      let parent: THREE.Object3D = this.camera;
      while (parent != null) {
        forward.applyEuler(parent.rotation);
        parent = parent.parent;
      }
      forward.normalize();
      const cosine = this.tmp.dot(forward) / r;
      const score = r / (1.01 + cosine);
      if (o instanceof ModelAsteroid) {
        if (minScore === null || minScore > score) {
          minScore = score;
          frontAsteroid = o;
          bestCosine = cosine;
        }
        if (minDistance === null || minDistance > r) {
          minDistance = r;
          closestAsteroid = o;
        }
      }
    }
    let altitude = -1;
    if (closestAsteroid != null) {
      closestAsteroid.getObject3D().getWorldPosition(this.tmp);
      this.tmp.sub(this.cameraWorld);
      this.tmp.normalize();
      this.raycaster.set(this.cameraWorld, this.tmp);
      const intersections = this.raycaster.intersectObject(closestAsteroid.getObject3D());
      if (intersections.length > 0) {
        this.tmp.copy(this.cameraWorld);
        this.tmp.sub(intersections[0].point);
        altitude = this.tmp.length();

        if (altitude < 1) {
          // TODO: clamp altitude to 1m.
          // TODO: Don't set velocity to zero if the boosters are on.
          this.tmp.setLength(0.3);
          this.player.velocity.copy(this.tmp);
          this.tmp.setLength(1 - altitude);;
          this.system.position.sub(this.tmp);
        }
      }
    }

    if (frontAsteroid != null) {
      frontAsteroid.getObject3D().getWorldPosition(this.asteroidWorld);
      // Landing pad position
      this.landingGuide.lookAt(this.asteroidWorld);
      this.landingGuide.setTargetDetails(
        {
          name: frontAsteroid.getName(),
          radius: `${frontAsteroid.getRadius().toFixed(1)}`,
          classification: frontAsteroid.getClass(),
          location: JSON.stringify(frontAsteroid.getObject3D().position),
          altitude: `${altitude.toFixed(1)}`,
          score: `${minScore.toFixed(2)}`,
          cosine: `${bestCosine.toFixed(3)}`,
        });
      this.landingGuide.setDistance(altitude, this.player.velocity.length());
    }
  }

  addSamples(
    posRandom: Random, position: THREE.Vector3, a: Asteroid, r: number,
    system: THREE.Object3D)
    : number {
    let numSmall = 0;
    for (let i = 0; i < posRandom.next() * 20; ++i) {
      const sample = new Sample(system);
      const m = sample.getObject3D();
      const p = new THREE.Vector3(r * 1.2, 0, 0);
      p.applyEuler(new THREE.Euler(
        0, posRandom.next() * Math.PI * 2, posRandom.next() * Math.PI));
      p.add(position);
      m.position.copy(p);
      this.smallBodies.newClient(p, 1, sample);
      ++numSmall;
    }
    return numSmall;
  }
}