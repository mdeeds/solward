import * as THREE from "three";

class ProximityEntry {
  constructor(
    readonly universalPosition: THREE.Vector3,
    readonly object: THREE.Object3D,
    public distance: number) { }
}

export class ProximityGroup {
  private entries: ProximityEntry[] = [];
  private observerPosition = new THREE.Vector3();

  constructor(observerPosition: THREE.Vector3) {
    this.observerPosition.copy(observerPosition);
  }

  insert(object: THREE.Object3D, universalPosition: THREE.Vector3) {
    const u = new THREE.Vector3();
    u.copy(universalPosition);
    const d = new THREE.Vector3();
    d.copy(universalPosition);
    d.sub(this.observerPosition);
    this.entries.push(new ProximityEntry(u, object, d.length()));
    this.sort();
  }

  private sort() {
    this.entries.sort((a, b) => { return a.distance - b.distance; });
  }

  public setObserverPosition(observerPosition: THREE.Vector3) {
    this.observerPosition = observerPosition;
    const v = new THREE.Vector3();
    for (let i = 0; i < this.entries.length && i < 50; ++i) {
      const pe = this.entries[i];
      v.copy(observerPosition);
      v.sub(pe.universalPosition);
      pe.distance = v.length();
    }
    this.sort();
  }

  public getClosest(): THREE.Object3D {
    return this.entries[0].object;
  }
}