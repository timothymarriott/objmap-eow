import * as L from 'leaflet';
import {MapBase} from '@/MapBase';
import {SearchResultUpdateMode} from '@/MapMarker';
import * as MapMarkers from '@/MapMarker';
import {MapMgr, ObjectMinData} from '@/services/MapMgr';
import {Settings} from '@/util/settings';
import * as ui from '@/util/ui';
import { isAreaObject } from './components/AppMapDetailsObj';

export interface SearchPreset {
  label: string;
  query: string;
}

export interface SearchPresetGroup {
  label: string;
  presets: SearchPreset[];
}

const LAUNCHABLE_OBJS = `TwnObj_City_GoronPot_A_M_Act_01
FldObj_BoardIron_A_01
FldObj_FallingRock_*
FldObj_KorokStoneLift_A_01
FldObj_PushRock*
Kibako*
Obj_BoardIron_*
Obj_BoxIron_*
Obj_BreakBoxIron*
Obj_LiftRock*
Obj_RockCover
Barrel`;

function makeActorQuery(actors: string[]): string {
  return actors.map(x => `actor:^${x}`).join(' OR ');
}

function makeNameQuery(names: string[]): string {
  return names.map(x => `name:^"${x}"`).join(' OR ');
}

export const SEARCH_PRESETS: ReadonlyArray<SearchPresetGroup> = Object.freeze([
  {
    label: '<i class="far fa-gem"></i>',
    presets: [
      {label: 'Treasure Chests', query: 'actor:^"TreasureBox"'},
    ],
  },
  {
    label: '<i class="fas fa-apple-alt"></i>',
    presets: [
      {label: 'Ingredients', query: 'actor:^SmoothieIngredient_*'},
    ],
  },
  {
    label: 'Other',
    presets: [
      {label: 'All in MAP', query: 'map_name:MAP'}
    ]
  }
]);

export class SearchExcludeSet {
  constructor(public query: string, public label: string, public hidden = false) {
  }

  size() {
    return this.ids.size;
  }

  ids: Set<number> = new Set();

  async init() {
    this.ids = new Set(await MapMgr.getInstance().getObjids(Settings.getInstance().mapName, this.query));
  }
}

export class SearchResultGroup {
  constructor(public query: string, public label: string, public enabled = true, public showAreas = false) {
  }

  size() {
    return this.markers.data ? this.markers.data.length : 0;
  }

  getMarkers() {
    return this.markers.data;
  }

  remove() {
    for (const [i, marker] of this.markers.data.entries()) {
      if (marker.areaMarker != null){
        marker.areaMarker.remove()
      }
    }
    this.markerGroup.data.remove();
    this.markerGroup.data.clearLayers();
    this.shownMarkers = new ui.Unobservable([]);
  }

  update(mode: SearchResultUpdateMode, excludedSets: SearchExcludeSet[]) {
    const isExcluded = (marker: MapMarkers.MapMarkerObj) => {
      return excludedSets.some(set => set.ids.has(marker.obj.objid));
    };
    for (const [i, marker] of this.markers.data.entries()) {
      const shouldShow = mode & SearchResultUpdateMode.UpdateVisibility
        ? (this.enabled && !isExcluded(marker)) : this.shownMarkers.data[i];
      if (shouldShow != this.shownMarkers.data[i]) {
        if (shouldShow)
          this.markerGroup.data.addLayer(marker.getMarker());
        else
          this.markerGroup.data.removeLayer(marker.getMarker());
        this.shownMarkers.data[i] = shouldShow;
      }


      const shouldShowArea = this.showAreas;

      if (shouldShow)
        marker.update(this.fillColor, this.strokeColor, mode, shouldShowArea);
      else {
        if (marker.areaMarker != null){
          marker.areaMarker.remove()
        }
      }

    }
  }

  setObjects(map: MapBase, objs: ObjectMinData[]) {
    this.markers = new ui.Unobservable(
        objs.map(r => new MapMarkers.MapMarkerObj(map, r, this.fillColor, this.strokeColor)));
    this.markerGroup.data.clearLayers();
    this.shownMarkers = new ui.Unobservable([]);
  }

  async init(map: MapBase) {
    this.fillColor = ui.shadeColor(ui.genColor(10, SearchResultGroup.COLOR_COUNTER++), -5);
    this.strokeColor = ui.shadeColor(this.fillColor, -20);
    this.markerGroup.data.addTo(map.m);
    if (!this.query)
      return;
    const results = await MapMgr.getInstance().getObjs(Settings.getInstance().mapName, this.query);
    this.setObjects(map, results);
  }

  private static COLOR_COUNTER = 0;
  private markerGroup = new ui.Unobservable<L.LayerGroup>(L.layerGroup());
  private markers = new ui.Unobservable<MapMarkers.MapMarkerObj[]>([]);
  private shownMarkers: ui.Unobservable<boolean[]> = new ui.Unobservable([]);
  private fillColor = '';
  private strokeColor = '';
}
