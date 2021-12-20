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

  private terrainWidthExtents = 100;
  private terrainDepthExtents = 100;
  private terrainWidth = 128;
  private terrainDepth = 128;
  private terrainHalfWidth = this.terrainWidth / 2;
  private terrainHalfDepth = this.terrainDepth / 2;
  private terrainMaxHeight = 8;
  private terrainMinHeight = - 2;

  private heightData: Float32Array = null;

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
  private objectTimePeriod = 0.5;
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
    this.heightData = this.generateHeight(
      this.terrainWidth, this.terrainDepth,
      this.terrainMinHeight, this.terrainMaxHeight);
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

    this.camera.position.y = this.heightData[
      this.terrainHalfWidth + this.terrainHalfDepth * this.terrainWidth] *
      (this.terrainMaxHeight - this.terrainMinHeight) + 5;

    this.camera.position.z = this.terrainDepthExtents / 2;
    this.camera.lookAt(0, 0, 0);

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableZoom = false;

    Model.Load('model/asteroid.gltf', { singleSided: true }).then((m: Model) => {
      m.scene.scale.set(0.2, 0.2, 0.2);
      m.scene.position.set(0, -30, 0);
      this.scene.add(m.scene);
      this.initPhysics(m.scene);
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

    const groundShape = this.createShapeFromGeometry(terrain);
    const groundTransform = new this.ammo.btTransform();
    groundTransform.setIdentity();
    // Shifts the terrain, since bullet re-centers it on its bounding box.
    groundTransform.setOrigin(new this.ammo.btVector3(0, (
      this.terrainMaxHeight + this.terrainMinHeight) / 2, 0));
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

  generateHeight(width: number, depth: number, minHeight: number, maxHeight: number) {
    // Generates the height data (a sinus wave)
    const size = width * depth;
    const data = new Float32Array(size);

    const hRange = maxHeight - minHeight;
    const w2 = width / 2;
    const d2 = depth / 2;
    const phaseMult = 12;

    let p = 0;

    for (let j = 0; j < depth; j++) {
      for (let i = 0; i < width; i++) {
        const radius = Math.sqrt(
          Math.pow((i - w2) / w2, 2.0) +
          Math.pow((j - d2) / d2, 2.0));
        const height = (Math.sin(radius * phaseMult) + 1) * 0.5 * hRange + minHeight;
        data[p] = height;
        p++;
      }
    }
    return data;
  }

  private addToShapeFromGeometry(o: THREE.Object3D,
    mesh: AmmoModule.btTriangleMesh) {
    if (o instanceof THREE.Mesh) {
      const geometry: THREE.BufferGeometry = o.geometry;
      let transform = new THREE.Matrix4();
      transform.copy(o.matrix);
      let p = o.parent;
      while (p != null) {
        // Maybe I need to compose these the other way???
        transform.multiplyMatrices(transform, p.matrix);
        p = p.parent;
      }
      const positionAttribute = geometry.attributes.position;
      if (!geometry.index) {
        throw new Error("Must have index.");
      }
      const index = geometry.index;
      for (var i = 0; i < geometry.attributes.position.count / 3; i++) {
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
      }
    }
    for (const c of o.children) {
      this.addToShapeFromGeometry(c, mesh);
    }
  }

  createShapeFromGeometry(o: THREE.Object3D) {
    console.log('Begin create shape.');
    const mesh: AmmoModule.btTriangleMesh = new this.ammo.btTriangleMesh(true, true);
    this.addToShapeFromGeometry(o, mesh);
    console.log('Mesh is filled.');
    var shape = new this.ammo.btBvhTriangleMeshShape(mesh, true, true);
    console.log('End create shape.');
    return shape;
  }


  createTerrainShape() {
    // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
    const heightScale = 1;
    // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
    const upAxis = 1;
    // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
    const hdt = "PHY_FLOAT";
    // Set this to your needs (inverts the triangles)
    const flipQuadEdges = false;
    // Creates height data buffer in Ammo heap
    this.ammoHeightData = this.ammo._malloc(
      4 * this.terrainWidth * this.terrainDepth);

    // Copy the javascript height data array to the Ammo one.
    let p = 0;
    let p2 = 0;

    for (let j = 0; j < this.terrainDepth; j++) {
      for (let i = 0; i < this.terrainWidth; i++) {
        // write 32-bit float data to memory
        this.ammo.HEAPF32[this.ammoHeightData + p2 >> 2] = this.heightData[p];
        p++;
        // 4 bytes/float
        p2 += 4;
      }
    }

    // Creates the heightfield physics shape
    const heightFieldShape = new this.ammo.btHeightfieldTerrainShape(
      this.terrainWidth,
      this.terrainDepth,
      this.ammoHeightData,
      heightScale,
      this.terrainMinHeight,
      this.terrainMaxHeight,
      upAxis,
      hdt,
      flipQuadEdges
    );

    // Set horizontal scale
    const scaleX = this.terrainWidthExtents / (this.terrainWidth - 1);
    const scaleZ = this.terrainDepthExtents / (this.terrainDepth - 1);
    heightFieldShape.setLocalScaling(new this.ammo.btVector3(scaleX, 1, scaleZ));

    heightFieldShape.setMargin(0.05);

    return heightFieldShape;

  }

  generateObject() {
    if (!this.physicsInitialized) {
      return;
    }
    const numTypes = 4;
    const objectType = Math.ceil(Math.random() * numTypes);

    let threeObject = null;
    let shape = null;

    const objectSize = 3;
    const margin = 0.05;

    let radius: number, height: number;

    switch (objectType) {

      case 1:
        // Sphere
        radius = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 20, 20),
          this.createObjectMaterial());
        shape = new this.ammo.btSphereShape(radius);
        shape.setMargin(margin);
        break;
      case 2:
        // Box
        const sx = 1 + Math.random() * objectSize;
        const sy = 1 + Math.random() * objectSize;
        const sz = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1),
          this.createObjectMaterial());
        shape = new this.ammo.btBoxShape(
          new this.ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
        shape.setMargin(margin);
        break;
      case 3:
        // Cylinder
        radius = 1 + Math.random() * objectSize;
        height = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, height, 20, 1),
          this.createObjectMaterial());
        shape = new this.ammo.btCylinderShape(
          new this.ammo.btVector3(radius, height * 0.5, radius));
        shape.setMargin(margin);
        break;
      default:
        // Cone
        radius = 1 + Math.random() * objectSize;
        height = 2 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.ConeGeometry(radius, height, 20, 2),
          this.createObjectMaterial());
        shape = new this.ammo.btConeShape(radius, height);
        break;
    }

    threeObject.position.set(
      (Math.random() - 0.5) * this.terrainWidth * 0.6,
      this.terrainMaxHeight + objectSize + 2,
      (Math.random() - 0.5) * this.terrainDepth * 0.6);

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
    if (this.dynamicObjects.length < this.maxNumObjects &&
      this.time > this.timeNextSpawn) {

      this.generateObject();
      this.timeNextSpawn = this.time + this.objectTimePeriod;
    }
    if (this.physicsInitialized) {
      this.updatePhysics(deltaTime);
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
