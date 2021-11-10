import * as THREE from "three";

export class GeometryUtils {

  // Changes `position` to be the position on the surface of `object`.
  // The object's origin, the original position, and the returned position
  // are all colinear.
  // `position` is in world space.
  static positionOnSurface(position: THREE.Vector3,
    object: THREE.Object3D, altitude = 0) {
    const objectCenter = new THREE.Vector3();
    object.getWorldPosition(objectCenter);
    const towardCenter = new THREE.Vector3();
    towardCenter.copy(objectCenter);
    towardCenter.sub(position);
    const farAway = new THREE.Vector3();
    farAway.copy(towardCenter);
    farAway.setLength(-1000);
    farAway.add(objectCenter);
    towardCenter.normalize();
    const raycaster = new THREE.Raycaster();
    raycaster.set(farAway, towardCenter);
    const intersections = raycaster.intersectObject(object);
    if (intersections.length === 0) {
      return;
    } else {
      position.copy(intersections[0].point);
      towardCenter.multiplyScalar(-altitude);
      position.add(towardCenter);
    }
  }

}