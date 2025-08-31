
import { MARKER_COMPONENTS } from '@/components/AppMap';
import { MAPS } from '@/components/AppMapSettings';
import { EOW_FILES } from '@/util/map';
import { Settings } from '@/util/settings';

export const RADAR_URL: string = process.env.VUE_APP_RADAR_URL;

export type Vec3 = [number, number, number];

export interface ResPlacementObj {
  readonly '!Parameters'?: { [key: string]: any };
  readonly SRTHash: number;
  readonly HashId: number;
  readonly OnlyOne?: boolean;
  readonly UniqueName?: string;
  readonly UnitConfigName: string;
  readonly LinksToObj?: any;
  readonly LinksToRail?: any;
  readonly Translate: Vec3;
  readonly Scale?: Vec3 | number;
  readonly Rotate?: Vec3 | number;
}

export const enum ObjectDropType {
  Actor = 1,
  Table = 2,
}

export interface ObjectMinData {
  actor: string,
  conditions: any[],
  data: {group07: number},
  group07_id: number,
  group10_id: any,
  hash: string,
  hash_id: number,
  map_name: string,
  name: string,
  objid: number,
  params: any[],
  region12: any[],
  scale: {min_x: number, min_y: number, min_z: number, max_x: number, max_y: number, max_z: number},
  translate: {x: number, y: number, z:number}

}

export interface ObjectData extends ObjectMinData {
  map_name: string;
}

export class PlacementLink {
  constructor(public readonly otherObj: ObjectData,
    public readonly linkIter: any,
    public readonly ltype: string,
  ) { }
}

function parse(r: Response) {
  if (r.status == 404)
    return null;
  return r.json().then(d => Object.freeze(d));
}

export class MapMgr {
  private static instance: MapMgr;
  static getInstance() {
    if (!this.instance)
      this.instance = new this();
    return this.instance;
  }

  private infos: Map<string, any> = new Map();

  async init() {
    await Promise.all(MAPS.map(async m => {
      const res = await fetch(`${EOW_FILES}/map_summary/${m.text}/static.json`);
      if (res.headers.has("Content-Type")){
        if (res.headers.get("Content-Type")!.startsWith("text/html")){
          return;
        }
      }

      try {
        const d = await res.json();
        this.infos.set(m.text, Object.freeze(d));
      // eslint-disable-next-line no-empty
      } catch {
      }


    }))
  }

  getInfo() {
    if (!this.infos.has(Settings.getInstance().mapName)) {
      let data: any = {};

      for (const key of Object.keys(MARKER_COMPONENTS)){
        data[key] = []
      }
      return {markers: data};
    }
    return this.infos.get(Settings.getInstance().mapName);
  }

  getObjByObjId(objid: number): Promise<ObjectData | null> {
    return fetch(`${RADAR_URL}/obj/${objid}`).then(parse);
  }
  getObj(mapName: string, hashId: number): Promise<ObjectData | null> {
    return fetch(`${RADAR_URL}/obj/${mapName}/${hashId}`).then(parse);
  }

  getObjs(mapName: string, query: string, withMapNames = false, limit = -1): Promise<ObjectMinData[]> {
    let url = new URL(`${RADAR_URL}/objs/${mapName}`);
    url.search = new URLSearchParams({
      q: query,
      withMapNames: withMapNames.toString(),
      limit: limit.toString(),
    }).toString();
    return fetch(url.toString()).then(parse);
  }

  getObjids(mapName: string, query: string): Promise<number[]> {
    let url = new URL(`${RADAR_URL}/objids/${mapName}`);
    url.search = new URLSearchParams({
      q: query,
    }).toString();
    return fetch(url.toString()).then(parse);
  }
}
