import * as THREE from "three";
import AmmoModule from "ammojs-typed";
import { Model } from "./model";

export class Debug6 {
  private ammo: typeof AmmoModule;
  constructor() {
    this.setBodyContent();
    this.setup();
  }

  // <!DOCTYPE html>
  // <html lang="en">
  //   <head>
  //     <title>Ammo.js terrain heightfield demo</title>
  //     <meta charset="utf-8">
  //     <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
  //     <link type="text/css" rel="stylesheet" href="main.css">
  //     <style>
  //       body {
  //         color: #333;
  //       }
  //     </style>
  //   </head>
  //   <body>

  private terrainWidth = 50;
  private terrainDepth = 50;
  private terrainMaxHeight = 8;

  // Graphics variables
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;;
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  // Physics variables
  private collisionConfiguration: AmmoModule.btDefaultCollisionConfiguration | AmmoModule.btCollisionConfiguration;
  private dispatcher: AmmoModule.btDispatcher;
  private broadphase: AmmoModule.btBroadphaseInterface;
  private solver: AmmoModule.btSequentialImpulseConstraintSolver | AmmoModule.btConstraintSolver;
  private physicsWorld: AmmoModule.btDiscreteDynamicsWorld;
  private dynamicObjects: THREE.Object3D[] = [];
  private transformAux1: AmmoModule.btTransform;

  private ammoHeightData = null;

  private time = 0;
  private objectTimePeriod = 0.05;
  private timeNextSpawn = this.time + this.objectTimePeriod;
  private maxNumObjects = 300;
  private physicsInitialized = false;

  private setup() {
    AmmoModule().then((lib) => {
      this.ammo = lib;
      this.init();
      this.animate();
    });

  }


  init() {
    this.initGraphics();
  }

  initGraphics() {
    this.container = document.getElementById('container');
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.top = '0px';
    // container.appendChild(stats.domElement);

    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.2, 2000);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfd1e5);

    this.camera.position.set(0, 60, 0);
    this.camera.lookAt(0, 0, 0);

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableZoom = false;

    Model.Load('model/asteroid4-collider.gltf', { singleSided: true }).then((m: Model) => {
      // const geo = new THREE.SphereBufferGeometry(2);
      // geo.scale(10, 1, 10);
      // geo.translate(0, -15, 0);
      // geo.rotateZ(-0.1);
      // const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 'blue' }));
      const mesh = m.scene;
      const o = new THREE.Group();
      o.add(mesh);
      const sp = new URL(document.URL).searchParams;
      o.position.set(parseFloat(sp.get('x')), -300, parseFloat(sp.get('z')));
      o.scale.set(1, 1, 1);
      o.rotation.set(-Math.PI / 2, 0, 0);
      console.log(`rotation: ${JSON.stringify(o.rotation)}`);
      this.scene.add(o);
      console.log(`rotation: ${JSON.stringify(o.rotation)}`);
      this.initPhysics(o);
    });

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 100, 50);
    light.castShadow = false;
    this.scene.add(light);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initPhysics(terrain: THREE.Object3D) {
    console.log(`rotation: ${JSON.stringify(terrain.rotation)}`);
    // Physics configuration
    this.collisionConfiguration =
      new this.ammo.btDefaultCollisionConfiguration();
    this.dispatcher = new this.ammo.btCollisionDispatcher(
      this.collisionConfiguration);
    this.broadphase = new this.ammo.btDbvtBroadphase();
    this.solver = new this.ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new this.ammo.btDiscreteDynamicsWorld(
      this.dispatcher, this.broadphase,
      this.solver, this.collisionConfiguration);
    this.physicsWorld.setGravity(new this.ammo.btVector3(0, - 6, 0));

    // Create the terrain body

    console.log(`rotation: ${JSON.stringify(terrain.rotation)}`);
    const groundShape = this.createShapeFromGeometry(terrain);
    console.log(`rotation: ${JSON.stringify(terrain.rotation)}`);
    const groundTransform = new this.ammo.btTransform();
    groundTransform.setIdentity();
    // Shifts the terrain, since bullet re-centers it on its bounding box.
    groundTransform.setOrigin(new this.ammo.btVector3(0, 0, 0));
    const groundMass = 0;
    const groundLocalInertia = new this.ammo.btVector3(0, 0, 0);
    const groundMotionState = new this.ammo.btDefaultMotionState(groundTransform);
    const groundBody = new this.ammo.btRigidBody(
      new this.ammo.btRigidBodyConstructionInfo(
        groundMass, groundMotionState, groundShape, groundLocalInertia));
    this.physicsWorld.addRigidBody(groundBody);

    this.transformAux1 = new this.ammo.btTransform();
    this.physicsInitialized = true;
  }

  private addToShapeFromGeometry(o: THREE.Object3D,
    mesh: AmmoModule.btTriangleMesh) {
    console.log(`rotation: ${JSON.stringify(o.rotation)}`);
    if (o instanceof THREE.Mesh) {
      const geometry: THREE.BufferGeometry = o.geometry;
      let p: THREE.Object3D = o;
      const translation = new THREE.Matrix4();
      const scale = new THREE.Matrix4();
      const rotation = new THREE.Matrix4();
      console.log('Applying transformations');
      const transformStack: THREE.Matrix4[] = [];
      while (p != null) {
        let transform = new THREE.Matrix4();
        transform.identity();
        console.log(p.name);
        console.log('matrix: ' + JSON.stringify(p.matrix));
        translation.makeTranslation(p.position.x, p.position.y, p.position.z);
        console.log('translation: ' + JSON.stringify(translation));
        scale.makeScale(p.scale.x, p.scale.y, p.scale.z);
        console.log('scale: ' + JSON.stringify(scale));
        rotation.makeRotationFromEuler(p.rotation);
        console.log('rotation: ' + JSON.stringify(rotation) + ' = ' + JSON.stringify(p.rotation));
        transform.multiplyMatrices(transform, translation);
        transform.multiplyMatrices(transform, rotation);
        transform.multiplyMatrices(transform, scale);
        transformStack.push(transform);
        p = p.parent;
      }
      let transform = new THREE.Matrix4();
      transform.identity();
      while (transformStack.length > 0) {
        transform.multiplyMatrices(transform, transformStack.pop());
      }
      console.log('Total: ' + JSON.stringify(transform));
      const positionAttribute = geometry.attributes.position;
      if (!geometry.index) {
        throw new Error("Must have index.");
      }
      const index = geometry.index;
      let maxX = 0;
      for (var i = 0; i < index.count / 3; i++) {
        const vertexAIndex = index.getX(i * 3);
        const vertexBIndex = index.getX(i * 3 + 1);
        const vertexCIndex = index.getX(i * 3 + 2);
        const a = new THREE.Vector3();
        a.fromBufferAttribute(positionAttribute, vertexAIndex);
        a.applyMatrix4(transform);
        const b = new THREE.Vector3();
        b.fromBufferAttribute(positionAttribute, vertexBIndex);
        b.applyMatrix4(transform);
        const c = new THREE.Vector3();
        c.fromBufferAttribute(positionAttribute, vertexCIndex);
        c.applyMatrix4(transform);
        mesh.addTriangle(
          new this.ammo.btVector3(a.x, a.y, a.z),
          new this.ammo.btVector3(b.x, b.y, b.z),
          new this.ammo.btVector3(c.x, c.y, c.z),
          false
        );
        maxX = Math.max(maxX, a.x, b.x, c.x);
      }
      console.log(`maxX: ${maxX}`);
    }
    for (const c of o.children) {
      this.addToShapeFromGeometry(c, mesh);
    }
  }

  createShapeFromGeometry(o: THREE.Object3D) {
    console.log('Begin create shape.');
    console.log(`rotation: ${JSON.stringify(o.rotation)}`);

    const mesh: AmmoModule.btTriangleMesh = new this.ammo.btTriangleMesh(true, true);
    this.addToShapeFromGeometry(o, mesh);
    console.log('Mesh is filled.');
    var shape = new this.ammo.btBvhTriangleMeshShape(mesh, true, true);
    console.log('End create shape.');
    return shape;
  }

  generateObject() {
    if (!this.physicsInitialized) {
      return;
    }
    let threeObject = null;
    let shape = null;

    const objectSize = 1;
    const margin = 0.05;

    let radius: number, height: number;

    // Sphere
    radius = 1;
    threeObject = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 20),
      this.createObjectMaterial());
    shape = new this.ammo.btSphereShape(radius);
    shape.setMargin(margin);

    const r = Math.random() * 10;
    const th = Math.random() * 2 * Math.PI;

    threeObject.position.set(
      r * Math.cos(th), 20, r * Math.sin(th));

    const mass = objectSize * 5;
    const localInertia = new this.ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);
    const transform = new this.ammo.btTransform();
    transform.setIdentity();
    const pos = threeObject.position;
    transform.setOrigin(new this.ammo.btVector3(pos.x, pos.y, pos.z));
    const motionState = new this.ammo.btDefaultMotionState(transform);
    const rbInfo = new this.ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    const body = new this.ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    threeObject.receiveShadow = true;
    threeObject.castShadow = true;

    this.scene.add(threeObject);
    this.dynamicObjects.push(threeObject);

    this.physicsWorld.addRigidBody(body);
  }

  createObjectMaterial() {
    const c = Math.floor(Math.random() * (1 << 24));
    return new THREE.MeshPhongMaterial({ color: c });
  }

  animate() {
    requestAnimationFrame(() => { this.animate() });
    this.render();
    // stats.update();

  }

  render() {
    const deltaTime = this.clock.getDelta();
    if (this.dynamicObjects.length >= this.maxNumObjects) {
      for (const o of this.dynamicObjects) {
        this.scene.remove(o);
      }
      this.dynamicObjects.length = 0;
    }
    if (this.time > this.timeNextSpawn) {
      this.generateObject();
      this.timeNextSpawn = this.time + this.objectTimePeriod;
    }
    if (this.physicsInitialized) {
      this.updatePhysics(deltaTime);
    }
    if (this.dynamicObjects.length > 30) {
      this.camera.position.copy(this.dynamicObjects[30].position);
      this.camera.lookAt(0, -400, 0);
    } else {
      this.camera.position.set(0, 60, 0);
    }
    this.renderer.render(this.scene, this.camera);
    this.time += deltaTime;
  }

  updatePhysics(deltaTime: number) {
    this.physicsWorld.stepSimulation(deltaTime, 10);

    // Update objects
    for (let i = 0, il = this.dynamicObjects.length; i < il; i++) {

      const objThree = this.dynamicObjects[i];
      const objPhys = objThree.userData.physicsBody;
      const ms = objPhys.getMotionState();
      if (ms) {

        ms.getWorldTransform(this.transformAux1);
        const p = this.transformAux1.getOrigin();
        const q = this.transformAux1.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
  }

  private setBodyContent() {
    const body = document.querySelector('body');
    body.innerHTML = `
        <div id="container"></div>
        <div id="info">Ammo.js physics terrain heightfield demo</div>
    `;
  }

}
