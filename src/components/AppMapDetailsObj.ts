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

enum MapLinkDefType {
  BasicSig = 0x0,
  AxisX = 0x1,
  AxisY = 0x2,
  AxisZ = 0x3,
  '-AxisX' = 0x4,
  '-AxisY' = 0x5,
  '-AxisZ' = 0x6,
  GimmickSuccess = 0x7,
  VelocityControl = 0x8,
  BasicSigOnOnly = 0x9,
  Remains = 0xA,
  DeadUp = 0xB,
  LifeZero = 0xC,
  Stable = 0xD,
  ChangeAtnSig = 0xE,
  Create = 0xF,
  Delete = 0x10,
  MtxCopyCreate = 0x11,
  Freeze = 0x12,
  ForbidAttention = 0x13,
  SyncLink = 0x14,
  CopyWaitRevival = 0x15,
  OffWaitRevival = 0x16,
  Recreate = 0x17,
  AreaCol = 0x18,
  SensorBind = 0x19,
  ForSale = 0x1A,
  ModelBind = 0x1B,
  PlacementLOD = 0x1C,
  DemoMember = 0x1D,
  PhysSystemGroup = 0x1E,
  StackLink = 0x1F,
  FixedCs = 0x20,
  HingeCs = 0x21,
  LimitHingeCs = 0x22,
  SliderCs = 0x23,
  PulleyCs = 0x24,
  BAndSCs = 0x25,
  BAndSLimitAngYCs = 0x26,
  CogWheelCs = 0x27,
  RackAndPinionCs = 0x28,
  Reference = 0x29,
  Invalid = 0x2A,
}

function numOrArrayToArray(x: number | [number, number, number] | undefined): [number, number, number] | undefined {
  return typeof x == 'number' ? [x, x, x] : x;
}

function isAreaObject(obj: ObjectMinData) {
  const areaObjectNames = ["Area", "BoxWater", "SpotBgmTag", "PointWindSetTag", "AreaCulling_InnerHide",
    "AreaCulling_InnerOn", "AreaCulling_OuterNPCMementary", "FarModelCullingArea"];
  return areaObjectNames.includes(obj.name) || obj.name.startsWith('AirWall');
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
  areaMarkers: any;


  async init() {
    this.minObj = this.marker.data.obj;
    this.obj = null;

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

    const southWest = L.latLng(z + obj.scale.max_z, x - obj.scale.min_x);
    const northEast = L.latLng(z - obj.scale.min_z, x + obj.scale.max_x);
    areaMarker = L.rectangle(L.latLngBounds(southWest, northEast), {
      // @ts-ignore
      transform: true,
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

  getNextFlowerInKorokFlowerTrail(group: any[], flower: any): any {
    let or = this.findItemByHash(group, flower.data.LinksToObj, "LinkTagOr");
    if (!or) {
      return null;
    }
    let lag = this.findItemByHash(group, or.data.LinksToObj, "SwitchTimeLag");
    if (!lag) {
      return null;
    }
    let and = this.findItemByHash(group, lag.data.LinksToObj, "LinkTagAnd");
    if (!and) {
      return null;
    }
    let plant = this.findItemByHash(group, and.data.LinksToObj, "Obj_Plant_Korok_A_01");
    return plant;
  }

  isLastFlowerInKorokFlowerTrail(flower: any): boolean {
    return flower.data['!Parameters'].IsLastKorokFlower;
  }

  getFlowersInKorokFlowerTrail(group: any[], flower: any): any[] {
    let flowers = [flower];
    while (flower && !this.isLastFlowerInKorokFlowerTrail(flower)) {
      let f = this.getNextFlowerInKorokFlowerTrail(group, flower);
      flowers.push(f);
      flower = f;
    }
    return flowers;
  }

  getKorokIcon(obj_name: string, style: string = "", text: string = ""): L.DivIcon {
    let html = "";
    let className = "";
    if (obj_name == "FldObj_KorokStartingBlock_A_01") {
      html = '<div class="stump"><i class="fa fa-leaf big-leaf"></i></div>';
    } else if (obj_name == "FldObj_KorokGoal_A_01") {
      html = svg.raceGoal;
    } else if (obj_name == "Obj_Plant_Korok_A_01") {
      html = `<div><i class="fa fa-leaf korokicon" style="${style}"></i>${text}</div>`;
    } else if (rock_target.includes(obj_name)) {
      html = '<i class="fa fa-bullseye" style="font-size: 1.6em; color: rgba(255,255,255,0.6);"></i>';
    } else if (rock_source.includes(obj_name)) {
      html = '<i class="fa fa-cloud" style="font-size: 1.6em; color: #bbb; text-shadow: black 0px 0px 3px; "></i>';
    }
    return L.divIcon({
      html: html, className: className, iconSize: [30, 30], iconAnchor: [15, 15],
    });
  }

  getKorokMarkerWithIcon(obj: any, style: string = "", text: string = "") {
    let icon = this.getKorokIcon(obj.data.UnitConfigName, style, text);
    return L.marker([obj.data.Translate[2], obj.data.Translate[0]], { icon: icon });
  }

}
