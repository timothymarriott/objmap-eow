
import { EOW_FILES, GAME_FILES } from '@/util/map';

const RADAR_URL = process.env.VUE_APP_RADAR_URL;

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

  private infoMainField: any;

  async init() {
    await Promise.all([
      fetch(`${EOW_FILES}/map_summary/MainField/static.json`).then(r => r.json())
        .then((d) => {
          this.infoMainField = Object.freeze(d);
        }),
    ]);
  }

  fetchAreaMap(name: string): Promise<{ [data: number]: Array<GeoJSON.Polygon | GeoJSON.MultiPolygon> }> {
    return fetch(`${GAME_FILES}/ecosystem/${name}.json`).then(parse);
  }

  getInfoMainField() {
    return this.infoMainField;
  }

  getObjByObjId(objid: number): Promise<ObjectData | null> {
    return fetch(`${RADAR_URL}/obj/${objid}`).then(parse);
  }
  getObj(mapName: string, hashId: number): Promise<ObjectData | null> {
    return fetch(`${RADAR_URL}/obj/${mapName}/${hashId}`).then(parse);
  }

  getObjGenGroup(mapType: string, mapName: string, hashId: number): Promise<ObjectData[]> {
    return fetch(`${RADAR_URL}/obj/${mapType}/${mapName}/${hashId}/gen_group`).then(parse);
  }

  getObjShopData() {
    return fetch(`${GAME_FILES}/ecosystem/beedle_shop_data.json`).then(parse);
  }

  getObjDropTables(unitConfigName: string, tableName: string) {
    return fetch(`${RADAR_URL}/drop/${unitConfigName}/${tableName}`).then(parse);
  }

  getObjRails(hashId: number): Promise<any> {
    return fetch(`${RADAR_URL}/rail/${hashId}`).then(parse);
  }

  getObjs(mapType: string, mapName: string, query: string, withMapNames = false, limit = -1): Promise<ObjectMinData[]> {
    let url = new URL(`${RADAR_URL}/objs/${mapType}/${mapName}`);
    url.search = new URLSearchParams({
      q: query,
      withMapNames: withMapNames.toString(),
      limit: limit.toString(),
    }).toString();
    return fetch(url.toString()).then(parse);
  }

  getObjids(mapType: string, mapName: string, query: string): Promise<number[]> {
    let url = new URL(`${RADAR_URL}/objids/${mapType}/${mapName}`);
    url.search = new URLSearchParams({
      q: query,
    }).toString();
    return fetch(url.toString()).then(parse);
  }
}
