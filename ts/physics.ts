import * as THREE from "three";
import Ammo from "ammojs-typed";
import { Ticker } from "./ticker";

export type ProjectionCallback =
  (distance: number, intersection: THREE.Vector3, etaS: number) => void;

export class RaycastResult {
  constructor(readonly distanceM: number,
    readonly intersection: THREE.Vector3,
    readonly normal: THREE.Vector3) { }
}

export class Physics implements Ticker {
  private movingObjects: THREE.Object3D[] = [];
  private collisionCallbacks: ProjectionCallback[] = [];
  public constructor(private physicsWorld: Ammo.btDiscreteDynamicsWorld,
    private ammo: typeof Ammo) {
  }

  addCollisionCallback(cb: ProjectionCallback) {
    this.collisionCallbacks.push(cb);
  }

  private addGeometryToShape(geometry: THREE.BufferGeometry,
    transform: THREE.Matrix4,
    mesh: Ammo.btTriangleMesh) {
    let numInward = 0;
    let numOutward = 0;
    const positionAttribute = geometry.attributes.position;
    if (!geometry.index) {
      throw new Error("Must have index.");
    }
    const index = geometry.index;
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
      b.sub(a);
      c.sub(a);
      b.cross(c);
      let direction = a.dot(b);
      if (direction > 0) {
        ++numOutward;
      } else {
        ++numInward;
      }
    }
    console.log(`Inward: ${numInward}, outward: ${numOutward}`);
  }

  createShapeFromGeometry(geometry: THREE.BufferGeometry)
    : Ammo.btTriangleMesh {
    const mesh: Ammo.btTriangleMesh = new this.ammo.btTriangleMesh(true, true);
    const transform = new THREE.Matrix4();
    transform.identity();
    this.addGeometryToShape(geometry, transform, mesh);
    return mesh;
  }

  private addToShapeFromObject(o: THREE.Object3D,
    mesh: Ammo.btTriangleMesh) {
    console.log(`rotation: ${JSON.stringify(o.rotation)}`);
    if (o instanceof THREE.Mesh) {
      let p: THREE.Object3D = o;
      const translation = new THREE.Matrix4();
      const scale = new THREE.Matrix4();
      const rotation = new THREE.Matrix4();
      console.log('Applying transformations');
      const transformStack: THREE.Matrix4[] = [];
      while (p != null) {
        let transform = new THREE.Matrix4();
        transform.identity();
        translation.makeTranslation(p.position.x, p.position.y, p.position.z);
        scale.makeScale(p.scale.x, p.scale.y, p.scale.z);
        rotation.makeRotationFromEuler(p.rotation);
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
      const geometry: THREE.BufferGeometry = o.geometry;
      this.addGeometryToShape(geometry, transform, mesh);
    }
    for (const c of o.children) {
      this.addToShapeFromObject(c, mesh);
    }
  }

  createShapeFromObject(object: THREE.Object3D)
    : Ammo.btTriangleMesh {
    const mesh: Ammo.btTriangleMesh = new this.ammo.btTriangleMesh(true, true);
    this.addToShapeFromObject(object, mesh);
    return mesh;
  }

  addStaticBody(mesh: Ammo.btTriangleMesh, transform: THREE.Matrix4) {
    const shape = new this.ammo.btBvhTriangleMeshShape(mesh, true, true);
    const ammoTransform = new this.ammo.btTransform();
    ammoTransform.setIdentity();
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(transform);
    const scale = new THREE.Vector3();
    scale.setFromMatrixScale(transform);
    const btScale = new this.ammo.btVector3(scale.x, scale.y, scale.z);
    shape.setLocalScaling(btScale);
    shape.setMargin(1.0 / btScale.x());
    console.log(`Physics position: ${position.y} : -200`);

    ammoTransform.setOrigin(new this.ammo.btVector3(
      position.x, position.y, position.z));
    const mass = 0;  // Zero mass tells Ammo that this object does not move.
    const localInertia = new this.ammo.btVector3(0, 0, 0);
    const motionState = new this.ammo.btDefaultMotionState(ammoTransform);
    shape.calculateLocalInertia(mass, localInertia);

    const body = new this.ammo.btRigidBody(
      new this.ammo.btRigidBodyConstructionInfo(
        mass, motionState, shape, localInertia));
    body.setRestitution(0.8);
    // body.setLinearVelocity(new this.ammo.btVector3(0, 0, 0));
    this.physicsWorld.addRigidBody(body);
  }

  addMovingBody(radius: number, threeObject: THREE.Object3D,
    referenceObject: THREE.Object3D) {
    console.log(`System position: ${referenceObject.position.y} : -200`);
    console.log(`Player position: ${threeObject.position.y} : 0`);
    const shape = new this.ammo.btSphereShape(radius);
    const margin = 0.5;
    shape.setMargin(margin);
    const mass = 100;
    const localInertia = new this.ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);
    const transform = new this.ammo.btTransform();
    transform.setIdentity();
    const pos = new THREE.Vector3();
    pos.copy(threeObject.position);
    pos.sub(referenceObject.position);
    console.log(`Physics position: ${pos.y} 200`)
    transform.setOrigin(new this.ammo.btVector3(pos.x, pos.y, pos.z));
    const motionState = new this.ammo.btDefaultMotionState(transform);
    const rbInfo = new this.ammo.btRigidBodyConstructionInfo(
      mass, motionState, shape, localInertia);
    const body = new this.ammo.btRigidBody(rbInfo);
    // body.setCollisionFlags(2);  // Kinematic.
    body.setActivationState(4);  // Disable deactivation
    body.activate(true);
    body.setLinearVelocity(new this.ammo.btVector3(0, 0, 0));
    body.setRestitution(0.8);

    threeObject.userData.physicsBody = body;
    this.movingObjects.push(threeObject);

    this.physicsWorld.addRigidBody(body);
  }

  // Input vectors are in Physics space.
  public raycast(from: THREE.Vector3, to: THREE.Vector3): RaycastResult {
    const btFrom = new this.ammo.btVector3(from.x, from.y, from.z);
    const btTo = new this.ammo.btVector3(to.x, to.y, to.z);
    let result: RaycastResult = null;
    return this.runRayTest(btFrom, btTo);
  }

  private runRayTest(from: Ammo.btVector3, to: Ammo.btVector3): RaycastResult {
    const closestRayResultCallback = new this.ammo.ClosestRayResultCallback(
      from, to);
    this.physicsWorld.rayTest(from, to, closestRayResultCallback);
    // const allRayResultCallback = new this.ammo.AllHitsRayResultCallback(
    //   from, to);
    // this.physicsWorld.rayTest(from, to, allRayResultCallback);
    if (closestRayResultCallback.hasHit()) {
      const btIntersection = closestRayResultCallback.get_m_hitPointWorld();
      const intersection = new THREE.Vector3(
        btIntersection.x(), btIntersection.y(), btIntersection.z());
      const btNormal = closestRayResultCallback.get_m_hitNormalWorld();
      const normal = new THREE.Vector3(btNormal.x(), btNormal.y(), btNormal.z());
      btIntersection.op_sub(from);
      const distanceM = btIntersection.length();
      return new RaycastResult(distanceM, intersection, normal);
    } else {
      return null;
    }
  }

  private rayTest(physicsObject: Ammo.btRigidBody) {
    const from = physicsObject.getWorldTransform().getOrigin();
    const to = new this.ammo.btVector3(0, 0, 0);
    const v = physicsObject.getLinearVelocity();
    const mps = v.length();
    if (mps <= 0) { return; }
    let forward = new this.ammo.btVector3(v.x(), v.y(), v.z());
    forward.normalize();
    forward = forward.op_mul(10000);
    to.setValue(from.x(), from.y(), from.z());
    to.op_add(forward);

    const rr = this.runRayTest(from, to);
    for (const cb of this.collisionCallbacks) {
      if (rr != null) {
        const etaS = rr.distanceM / mps;
        cb(rr.distanceM, rr.intersection, etaS);
      } else {
        cb(null, null, null);
      }
    }
  }

  tick(elapsedS: number, deltaS: number) {
    if (deltaS === 0) {
      return;
    }
    const ammoTransformTmp = new this.ammo.btTransform();
    this.physicsWorld.stepSimulation(deltaS, 10);

    let colliding = false;
    if (this.physicsWorld.getPairCache().getNumOverlappingPairs() > 0) {
      colliding = true;
    }
    for (const o of this.movingObjects) {
      const physicsObject: Ammo.btRigidBody = o.userData['physicsBody'];
      const ms = physicsObject.getMotionState();
      if (ms) {
        this.rayTest(physicsObject);
      }
    }
  }

  applyForce(forceKgMpSS: THREE.Vector3, object: THREE.Object3D) {
    if (forceKgMpSS.lengthSq() === 0) {
      return;
    }
    // console.log(`Force: ${forceKgMpSS.length()}`);
    const ammoVector = new this.ammo.btVector3(
      forceKgMpSS.x, forceKgMpSS.y, forceKgMpSS.z);
    const physicsObject: Ammo.btRigidBody = object.userData['physicsBody'];
    physicsObject.applyCentralForce(ammoVector);
  }
}