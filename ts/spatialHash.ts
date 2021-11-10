import * as THREE from "three";

export interface Removeable {
  tag(): void;
  removeTag(): void;
}

export class SpatialClient<T> {
  readonly keys: string[] = [];
  constructor(readonly position: THREE.Vector3, readonly radius: number,
    readonly value: T) {
  }
}

export class SpatialHash<T extends Removeable> {
  private clients = new Map<string, Set<T>>();
  private tagged = new Set<T>();
  constructor(private gridSize: number) {
  }

  private getIndex(position: number[]): number[] {
    const i = Math.round(position[0] / this.gridSize);
    const j = Math.round(position[1] / this.gridSize);
    const k = Math.round(position[2] / this.gridSize);
    return [i, j, k];
  }

  private getKey(position: number[]) {
    const [i, j, k] = position;
    return `${i},${j},${k}`;
  }

  private insert(key: string, value: T) {
    if (!this.clients.has(key)) {
      this.clients.set(key, new Set<T>());
    }
    this.clients.get(key).add(value);
  }

  private iterateRange(position: THREE.Vector3, radius: number,
    f: (i: number, j: number, k: number) => void) {
    const low = this.getIndex([
      position.x - radius, position.y - radius, position.z - radius]);
    const high = this.getIndex([
      position.x + radius, position.y + radius, position.z + radius]);

    for (let i = low[0]; i <= high[0]; ++i) {
      for (let j = low[1]; j <= high[1]; ++j) {
        for (let k = low[2]; k <= high[2]; ++k) {
          f(i, j, k);
        }
      }
    }
  }

  newClient(
    position: THREE.Vector3, radius: number, value: T): SpatialClient<T> {
    const client = new SpatialClient(position, radius, value);
    this.addClient(client);
    return client;
  }

  private addClient(client: SpatialClient<T>) {
    this.iterateRange(client.position, client.radius, (i, j, k) => {
      const key = this.getKey([i, j, k]);
      this.insert(key, client.value);
      client.keys.push(key);
    });
  }

  removeClient(client: SpatialClient<T>) {
    for (const k of client.keys) {
      this.clients.get(k).delete(client.value);
    }
  }

  updateClient(client: SpatialClient<T>) {
    this.removeClient(client);
    this.addClient(client);
  }

  getNearby(position: THREE.Vector3, radius: number): Set<T> {
    const result = new Set<T>();
    this.iterateRange(position, radius, (i, j, k) => {
      const key = this.getKey([i, j, k]);
      if (this.clients.has(key)) {
        for (const c of this.clients.get(key)) {
          result.add(c);
        }
      }
    });
    return result;
  }

  tag(position: THREE.Vector3, radius: number): Set<T> {
    const previouslyTagged = this.tagged;
    this.tagged = this.getNearby(position, radius);
    for (const v of previouslyTagged) {
      if (!this.tagged.has(v)) {
        v.removeTag();
      }
    }
    for (const v of this.tagged) {
      if (!previouslyTagged.has(v)) {
        v.tag();
      }
    }
    return this.tagged;
  }
}