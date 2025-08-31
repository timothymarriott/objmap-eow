import * as L from 'leaflet';
import Vue from 'vue';
import { Prop } from 'vue-property-decorator';
import Component from 'vue-class-component';
import 'leaflet-path-transform';

import { MapMarkerObj, MapMarkerSearchResult } from '@/MapMarker';
import AppMapDetailsBase from '@/components/AppMapDetailsBase';
import ObjectInfo from '@/components/ObjectInfo';
import ShopData from '@/components/ShopData';
import { MapMgr, ObjectData, ObjectMinData, PlacementLink } from '@/services/MapMgr';
import { MsgMgr } from '@/services/MsgMgr';
import * as ui from '@/util/ui';
import { Settings } from '@/util/settings';

import * as curves from '@/util/curves';
import * as svg from '@/util/svg';

import { ColorScale } from '@/util/colorscale';
require('leaflet-hotline')

const KUH_TAKKAR_ELEVATOR_HASH_ID = 0x96d181a0;
const DRAGON_HASH_IDS = [
  0x4fb21727, // Farosh
  0xc119deb6, // Farosh Far
  0x54d56291, // Dinraal
  0xfc79f706, // Dinraal Far
  0xe61a0932, // Naydra
  0x86b9a466, // Naydra Far
];

const rock_target = ["Obj_LiftRockWhite_Korok_A_01", "Obj_LiftRockGerudo_Korok_A_01", "Obj_LiftRockEldin_Korok_A_01"];
const rock_source = ["Obj_LiftRockWhite_A_01", "Obj_LiftRockGerudo_A_01", "Obj_LiftRockEldin_A_01"];

function hashString(s: string) {
  // https://stackoverflow.com/a/7616484/1636285
  var hash = 0, i, chr;
  if (s.length === 0) return hash;
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash >>> 0;
}

function numOrArrayToArray(x: number | [number, number, number] | undefined): [number, number, number] | undefined {
  return typeof x == 'number' ? [x, x, x] : x;
}

export function isAreaObject(obj: ObjectMinData) {
  const areaObjectNames: string[] = [
    "MapVastAbyss"
  ];
  return areaObjectNames.includes(obj.name) || obj.name.startsWith("AirWall") || obj.name.startsWith("Sensor");
}

class StaticData {
  persistentAreaMarkers: L.Path[] = [];
  history: ObjectData[] = [];
  persistentKorokMarkers: any[] = [];
  colorScale: ColorScale | null = null;
  persistentRailMarkers: { [key: string]: any }[] = [];
  persistentRailLimits: { [key: string]: any } = {};
}

const staticData = new StaticData();

@Component({
  components: {
    ObjectInfo,
    ShopData,
  },
})
export default class AppMapDetailsObj extends AppMapDetailsBase<MapMarkerObj | MapMarkerSearchResult> {
  private minObj: ObjectMinData | null = null;
  private obj: ObjectData | null = null;
  private isInvertedLogicTag = false;

  private staticData = staticData;
  areaMarkers: any = [];


  async init() {
    this.minObj = this.marker.data.obj;
    this.obj = null;
    this.areaMarkers.forEach((m: { remove: () => any; }) => m.remove());
    this.areaMarkers = [];

    if (this.minObj.objid) {
      this.obj = (await MapMgr.getInstance().getObjByObjId(this.minObj.objid))!;
    } else {
      this.obj = (await MapMgr.getInstance().getObj(
        // @ts-ignore ( map_name: string? )
        this.minObj.map_name,
        this.minObj.hash_id))!;
      // Set the objid from the fetched data otherwise Vue does not update
      this.minObj.objid = this.obj.objid;
    }

    this.isInvertedLogicTag = this.obj.name === 'LinkTagNAnd' || this.obj.name === 'LinkTagNOr';

    this.initAreaMarkers();

    this.marker.data.mb.m.on('ColorScale:change', async (args: any) => {
      this.updateColorlineStyle({ palette: args.palette });
    });


  }


  updateColorlineStyle(style: any) {

  }

  getColorlineLimits(): any | null {

    // Min/Max, filter out undefined
    //   if all are undefined, return infinity/-infinity
    return null;
  }

  setColorlineLimits(limits: any) {
    this.updateColorlineStyle(limits);
    if (this.staticData.colorScale) {
      this.staticData.colorScale.minmax(limits.min, limits.max);
    }
  }

  updateColorScale() {
    let limits = this.getColorlineLimits();
    if (limits) {
      this.setColorlineLimits(limits);
    }
  }

  beforeDestroy() {
    this.areaMarkers.forEach((m: { remove: () => any; }) => m.remove());
    // Rails
    this.updateColorScale();
    if (!this.staticData.persistentRailMarkers.length) {
      this.forgetColorScale();
    }
  }

  getLocationSub() {
    const obj = this.marker.data.obj;

    return '';
  }

  isSearchResult() {
    return this.marker.data instanceof MapMarkerSearchResult;
  }

  emitBackToSearch() {
    this.$parent.$emit('AppMap:switch-pane', 'spane-search');
  }

  jumpToObj(obj: ObjectData, updateHistory = true) {
    if (updateHistory && this.obj)
      this.staticData.history.push(this.obj);
    this.$parent.$emit('AppMap:open-obj', obj);
  }

  goBack() {
    this.jumpToObj(this.staticData.history.pop()!, false);
  }

  arrayOrNumToStr(d: number[] | number, digits: number) {
    if (d == null)
      return '';
    if (Array.isArray(d))
      return d.map(x => x.toFixed(digits)).join(', ');
    return d.toFixed(digits);
  }


  private initAreaMarkers() {
    if (!this.obj)
      return;

    /*
    if (Settings.getInstance().showUnloadRadius) {
      this.addObjectTraverseDistance(this.obj)
    } else {
      this.addDungeonElevatorLoadAreaMarker(this.obj);
    }
      */
    if (isAreaObject(this.obj))
      this.addAreaMarker(this.obj);
  }


  private addAreaMarker(obj: ObjectData) {
    const mb = this.marker.data.mb;
    const {x, y, z} = obj.translate;
    const scale = obj.scale;

    if (!scale)
      return;

    let areaMarker: L.Path;
    // Super rough approximation. This could be improved by actually projecting the 3D shape...
    // A lot of shapes do not use any rotate feature though,
    // and for those this naïve approach should suffice.

    const southWest = L.latLng(z + scale.max_z, x + scale.max_x);
    const northEast = L.latLng(z + scale.min_z, x + scale.min_x);
    console.log(southWest)
    console.log(northEast)
    areaMarker = L.rectangle(L.latLngBounds(southWest, northEast), {
      // @ts-ignore
      transform: true,
      color: ui.genColor(1000, hashString(obj.name) % 1000)
    }).addTo(mb.m);


    areaMarker.bringToBack();
    this.areaMarkers.push(areaMarker);
  }

  isAreaReprPossiblyWrong(): boolean {
    if (!this.obj || !isAreaObject(this.obj))
      return false;

    return true;
  }

  keepAreaMarkersAlive() {
    this.staticData.persistentAreaMarkers.push(...this.areaMarkers);
    this.areaMarkers = [];
  }

  forgetPersistentAreaMarkers() {
    this.areaMarkers.length = this.areaMarkers.length;
    this.staticData.persistentAreaMarkers.forEach(m => m.remove());
    this.staticData.persistentAreaMarkers = [];
  }

  forgetColorScale() {
    if (this.staticData.colorScale) {
      this.staticData.colorScale.remove();
      this.staticData.colorScale = null;
    }
  }


  static getName(name: string) {
    return MsgMgr.getInstance().getName(name) || name;
  }


  findItemByHash(group: any[], links: any[], name: string): any {
    let hashes = links.map(link => link.DestUnitHashId);
    let out = group.find(g => g.data.UnitConfigName == name && hashes.includes(g.hash_id));
    return (out) ? out : null;
  }


}
