import * as L from 'leaflet';

import { MapBase } from '@/MapBase';
import * as MapIcons from '@/MapIcon';
import { MapMgr, ObjectData, ObjectMinData } from '@/services/MapMgr';
import { MsgMgr } from '@/services/MsgMgr';
import { CanvasMarker, CanvasMarkerOptions } from '@/util/CanvasMarker';
import { Point } from '@/util/map';
import * as math from '@/util/math';
import * as map from '@/util/map';
import * as ui from '@/util/ui';
import { Settings } from '@/util/settings';

export abstract class MapMarker {
  public title = '';
  public readonly mb: MapBase;

  constructor(mb: MapBase) {
    this.mb = mb;
  }

  abstract getMarker(): L.Marker | L.CircleMarker;
  shouldBeShown(): boolean { return true; }

  protected commonInit(): void {
    this.getMarker().on({ 'click': () => this.mb.emitMarkerSelectedEvent(this) });
  }
}

class MapMarkerImpl extends MapMarker {
  constructor(mb: MapBase, title: string, xyz: Point, options: L.MarkerOptions = {}) {
    super(mb);
    this.title = title;
    this.marker = L.marker(this.mb.fromXYZ(xyz), Object.assign(options, {
      title,
      contextmenu: true,
    }));
    super.commonInit();
  }

  getMarker() { return this.marker; }

  protected setTitle(title: string) {
    this.title = title;
    this.marker.options.title = title;
  }

  protected marker: L.Marker;
}

class MapMarkerCanvasImpl extends MapMarker {
  constructor(mb: MapBase, title: string, pos: {x: number, y: number, z:number}, options: CanvasMarkerOptions = {}) {
    super(mb);
    this.title = title;
    let extra: any = {};
    if (options.showLabel) {
      extra['permanent'] = true;
    }
    if (options.className) {
      extra['className'] = options.className;
    }
    this.marker = new CanvasMarker([pos.z, pos.x ], Object.assign(options, {
      bubblingMouseEvents: false,
      contextmenu: true,
    }));
    this.marker.bindTooltip(title, { pane: 'front2', ...extra });
    super.commonInit();
  }

  getMarker() { return this.marker; }

  protected marker: L.CircleMarker;
}

export interface MapMarkerData {
  SaveFlag?: string;
  Icon: any;
  Translate: {X: number, Y: number, Z: number};
  MessageID: string;

}

export interface LocationMarkerData extends MapMarkerData {

}

export interface LocationPointerMarkerData extends MapMarkerData {
  Type: map.MarkerType;
  PointerType: any;
  ShowLevel: any;
}

class MapMarkerGenericLocationMarker extends MapMarkerImpl {
  public readonly lm: map.LocationMarker;

  static ICONS_AND_LABELS: { [type: string]: [L.Icon, string] } = {
    'HeartPiece': [MapIcons.HEART_PIECE, 'Heart Piece'],
    'Stamp': [MapIcons.STAMP, ''],
    'Warp': [MapIcons.WARP, ''],
    'MightCrystal': [MapIcons.MIGHT_CRYSTAL, 'Might Crystal'],
    'Town': [MapIcons.TOWN, ''],
    'Shop': [MapIcons.SHOP, ''],
    'SubArea': [MapIcons.SUB_AREA, 'Sub Area'],
    'Rift': [MapIcons.RIFT, ''],
    'GreatFairy': [MapIcons.GREAT_FAIRY, 'Great Fairy'],
    'Dampe': [MapIcons.DAMPE, ''],
    'Luberi': [MapIcons.LUBERI, ''],
    'Minigame': [MapIcons.MINIGAME, ''],
    'Smoothie': [MapIcons.SMOOTHIE, 'Smoothie Stand'],
    'CheckPoint': [MapIcons.CHECKPOINT, ''],
    'Generic': [MapIcons.GENERIC, ''],
  };

  constructor(mb: MapBase, l: MapMarkerData, showLabel: boolean, zIndexOffset?: number) {
    const lm = new map.LocationMarker(l);
    const [icon, label] = MapMarkerGenericLocationMarker.ICONS_AND_LABELS[lm.getIcon()];
    const msgId = lm.getMessageId();
    const msg = msgId ? MsgMgr.getInstance().getMsgWithFile('StaticMsg/LocationMarker', msgId) : label;
    super(mb, msg, lm.getXYZ(), {
      icon,
      zIndexOffset,
    });
    if (showLabel) {
      this.marker.bindTooltip(msg, {
        permanent: true,
        direction: 'center',
        className: `map-marker type-${lm.getIcon()}`,
      });
    }
    this.lm = lm;
  }
}

export class MapMarkerLocation extends MapMarkerCanvasImpl {
  public readonly lp: map.LocationPointer;

  constructor(mb: MapBase, l: LocationPointerMarkerData) {
    const lp = new map.LocationPointer(l);
    const markerTypeStr = map.markerTypetoStr(lp.getType());
    const msg = lp.getMessageId();

    super(mb, msg, {x: lp.getXYZ()[0], y: lp.getXYZ()[1], z: lp.getXYZ()[2]}, { stroke: false, fill: false });
    this.marker.unbindTooltip();
    this.marker.bindTooltip(msg, {
      permanent: true,
      direction: 'center',
      className: `map-location show-level-${lp.getShowLevel()} type-${markerTypeStr}`,
    });
    this.lp = lp;
  }

  shouldBeShown() {
    return this.lp.shouldShowAtZoom(this.mb.zoom);
  }
}

export class MapMarkerShop extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerHeartPiece extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerStamp extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerWarp extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}


export class MapMarkerMightCrystal extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerTown extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerSubArea extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerRift extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerMinigame extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

export class MapMarkerSmoothie extends MapMarkerGenericLocationMarker {
  constructor(mb: MapBase, l: MapMarkerData) {
    super(mb, l, false);
  }
}

function getName(name: string) {
  if (Settings.getInstance().useActorNames)
    return name;
  return MsgMgr.getInstance().getName(name) || name;
}

function setObjMarkerTooltip(title: string, layer: L.Layer, obj: ObjectMinData) {
  const tooltipInfo = [title];

  layer.setTooltipContent(tooltipInfo.join('<br>'));
}

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

export const enum SearchResultUpdateMode {
  None = 0,
  UpdateStyle = 1 << 0,
  UpdateVisibility = 1 << 1,
  UpdateTitle = 1 << 2,
  UpdateAreaVisibility = 1 << 3
}

export class MapMarkerObj extends MapMarkerCanvasImpl {
  constructor(mb: MapBase, public readonly obj: ObjectMinData, fillColor: string, strokeColor: string) {
    super(mb, '', obj.translate, {
      radius: 7,
      weight: 2,
      fillOpacity: 0.7,
      fillColor,
      color: strokeColor,

      // @ts-ignore
      contextmenuItems: [

      ],
    });
    this.marker.bringToFront();
    this.updateTitle();
  }

  addAreaMarker() {

    const {x, y, z} = this.obj.translate;
    const scale = this.obj.scale;

    if (!scale)
      return;

    let areaMarker: L.Path;

    const southWest = L.latLng(z + scale.max_z, x + scale.max_x);
    const northEast = L.latLng(z + scale.min_z, x + scale.min_x);
    areaMarker = L.rectangle(L.latLngBounds(southWest, northEast), {
      // @ts-ignore
      transform: true,
      color: ui.genColor(1000, hashString(this.obj.name) % 1000)
    }).addTo(this.mb.m);

    areaMarker.bindTooltip(this.title, { pane: 'front2' });



    areaMarker.bringToBack();
    this.areaMarker = areaMarker;
  }

  updateTitle() {
    const actor = this.obj.name;
    this.title = getName(actor);
    setObjMarkerTooltip(this.title, this.marker, this.obj);
  }

  update(groupFillColor: string, groupStrokeColor: string, mode: SearchResultUpdateMode, shouldShowArea: boolean) {
    if (mode & SearchResultUpdateMode.UpdateTitle)
      this.updateTitle();

    if (mode & SearchResultUpdateMode.UpdateStyle) {
      let fillColor = groupFillColor;
      let color = groupStrokeColor;
      if (Settings.getInstance().colorPerActor) {
        fillColor = ui.genColor(1000, hashString(this.title) % 1000);
        color = ui.shadeColor(fillColor, -15);
      }

      this.marker.setStyle({
        fillColor,
        color,
      });
    }


    if (shouldShowArea){
      if (this.areaMarker != null)
        this.areaMarker.remove();
      this.addAreaMarker();
    } else {
      if (this.areaMarker != null)
        this.areaMarker.remove();
    }

    const radius = Math.min(Math.max(this.mb.zoom, 4), 7);
    this.marker.setRadius(radius);
    this.marker.setStyle({
      weight: radius >= 5 ? 2 : 0,
    });
  }



  areaMarker: L.Path | null = null
}

export class MapMarkerSearchResult extends MapMarkerObj {
  constructor(mb: MapBase, obj: ObjectMinData) {
    super(mb, obj, '#e02500', '#ff2a00');
  }
}
