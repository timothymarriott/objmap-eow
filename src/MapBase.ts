import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rastercoords';
import 'leaflet-contextmenu';
import 'leaflet-contextmenu/dist/leaflet.contextmenu.css';

import { CanvasMarker } from '@/util/CanvasMarker';
import * as map from '@/util/map';
import { Point } from '@/util/map';
import * as ui from '@/util/ui';
import '@/util/leaflet_tile_workaround.js';
import { Settings } from './util/settings';
import { MapMgr } from '@/services/MapMgr';

export const SHOW_ALL_OBJS_FOR_MAP_UNIT_EVENT = 'objmap::SHOW_ALL_OBJS_FOR_MAP_UNIT';
export const MARKER_SELECTED_EVENT = 'objmap::markerSelected';

const MAP_IMAGES: Map<string, L.LatLngBounds> = new Map([
  ["Field", new L.LatLngBounds([[-36, -50], [513.4, 714.0]])]
])

export class MapBase {
  m!: L.Map;
  center: Point = [0, 0, 0];
  zoom: number = map.DEFAULT_ZOOM;
  private zoomChangeCbs: Array<(zoom: number) => void> = [];
  mapImages: Map<string, L.Layer> = new Map();
  refGrid: Array<L.LayerGroup> = [];
  refGridOn: boolean = false;

  toXYZ(latlng: L.LatLng): Point {
    return [latlng.lng, 0, latlng.lat];
  }
  fromXYZ(pos: Point): L.LatLngExpression {
    return [pos[2], pos[0]];
  }

  setView(pos: Point, zoom = -1) {
    this.center = pos;
    this.setZoomProp(zoom == -1 ? this.m.getZoom() : zoom);
    this.m.setView(this.fromXYZ(this.center), this.zoom);
  }

  emitMarkerSelectedEvent(marker: any) { this.m.fireEvent(MARKER_SELECTED_EVENT, { marker }); }
  registerMarkerSelectedCb(cb: (marker: any) => void) { this.m.on(MARKER_SELECTED_EVENT, (e: any) => cb(e.marker)); }

  registerZoomChangeCb(cb: (zoom: number) => void) { this.zoomChangeCbs.push(cb); }
  registerMoveEndCb(cb: any) { this.m.on('moveend', cb); }
  registerZoomCb(cb: any) { this.m.on('zoom', cb); }
  // Fires shortly after zoomstart with the target zoom level.
  registerZoomAnimCb(cb: any) { this.m.on('zoomanim', cb); }
  registerZoomEndCb(cb: any) { this.m.on('zoomend', cb); }

  constructor(element: string) {
    this.constructMap(element);
    this.initBaseMap();
  }

  private constructMap(element: string) {
    const crs = L.Util.extend({}, L.CRS.Simple);
    // @ts-ignore
    crs.transformation = new L.Transformation(0.3, 0, 0.3, 0);

    L.Canvas.include({
      _botwDrawCanvasImageMarker(layer: CanvasMarker) {
        // @ts-ignore
        if (layer._empty())
          return;
        // @ts-ignore
        const p: L.Point = layer._point;
        const ctx: CanvasRenderingContext2D = this._ctx;
        const img: HTMLImageElement = (layer.options.icon)!;
        if (layer.options.iconWidth && layer.options.iconHeight) {
          ctx.drawImage(img, p.x - layer.options.iconWidth / 2, p.y - layer.options.iconHeight / 2,
            layer.options.iconWidth, layer.options.iconHeight);
        } else {
          ctx.drawImage(img, p.x - img.width / 2, p.y - img.height / 2);
        }
      },
    });

    let padding = 0.7;
    if (L.Browser.safari && L.Browser.mobile && L.Browser.retina) {
      padding = 0.1;
    }
    const renderer = L.canvas({
      // Set a larger padding to avoid markers fading in too late when dragging
      padding,
    });

    this.m = new L.Map(element, {
      attributionControl: false,
      zoomControl: false,
      zoom: map.DEFAULT_ZOOM,
      minZoom: map.MIN_ZOOM,
      maxZoom: map.MAX_ZOOM,

      crs,

      center: [231, 255],

      renderer,
      preferCanvas: true,

      maxBounds: [[-36, -50], [513.4, 714.0]],
      maxBoundsViscosity: 5,

      // @ts-ignore
      contextmenu: true,
      contextmenuItems: [
        {
          text: 'Copy coordinates',
          callback: ({ latlng }: ui.LeafletContextMenuCbArg) => {
            const [x, y, z] = this.toXYZ(latlng);
            ui.copyToClipboard(`${x},${z}`);
          },
        },
        {
          text: 'Center map here',
          callback: ({ latlng }: ui.LeafletContextMenuCbArg) => {
            this.m.panTo(latlng);
          }
        },
        {
          text: 'Show all objects in map unit',
          callback: ({ latlng }: ui.LeafletContextMenuCbArg) => {
            this.m.fire(SHOW_ALL_OBJS_FOR_MAP_UNIT_EVENT, { latlng });
          },
        }
      ],
    });

    this.registerZoomAnimCb((evt: L.ZoomAnimEvent) => {
      this.setZoomProp(evt.zoom);
    });
    this.registerMoveEndCb(() => {
      this.center = this.toXYZ(this.m.getCenter());
    });
  }

  changeMap(target: string) {



    if (!this.mapImages.has(target)){
      if (MAP_IMAGES.has(target)){
        const img = L.imageOverlay(`${map.EOW_FILES}/maptex/${target}.png`, MAP_IMAGES.get(target)!, {
          pane: 'base',
        });
        img.addTo(this.m);
        this.mapImages.set(target, img)
      }

    }

    this.mapImages.forEach(img => {
      this.m.removeLayer(img)
    })

    if (this.mapImages.get(target))
      this.m.addLayer(this.mapImages.get(target)!)

    if (MAP_IMAGES.has(target)){
      this.m.setMaxBounds(MAP_IMAGES.get(target)!)
      this.m.setView(MAP_IMAGES.get(target)!.getCenter(), this.m.getBoundsZoom(MAP_IMAGES.get(target)!))
    } else {
      this.m.setMaxBounds(new L.LatLngBounds([[-500, -500], [500, 500]]));
      this.m.setView([0, 0], 2)
    }

  }

  private initBaseMap() {
    const BASE_PANE = 'base';
    this.m.createPane(BASE_PANE).style.zIndex = '0';

    this.changeMap(Settings.getInstance().mapName);

    this.m.createPane('front').style.zIndex = '1000';
    this.m.createPane('front2').style.zIndex = '1001';



    this.refGridOn = false;
    this.m.on("zoom", () => {
    });
  }
  svgIconBase(width: number) {
    return L.divIcon({
      html: `<svg  viewBox="0 0 100 100" version="1.1"
preserveAspectRatio="none"  xmlns="http://www.w3.org/2000/svg" >
<path d="M 100 50 L 0 50 M 50 0 L 50 100" stroke="#60B0E0" stroke-width="${width}" />
</svg>`,
      className: "",
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
  }
  createMarkers() {
    const svgIcon = this.svgIconBase(3);
    const svgIcon2 = this.svgIconBase(6);
    const svgIcon3 = this.svgIconBase(12);
    let size = 125;
    let markers = [L.layerGroup(), L.layerGroup(), L.layerGroup(), L.layerGroup()];
    for (let i = 0; i < 20 * 4; i++) {
      for (let j = 0; j < 16 * 4; j++) {
        let z = -4000 + j * size + 125 / 2;
        let x = -5000 + i * size + 125 / 2;
        let k = 2;
        let icon = svgIcon;
        if (i % 4 == 0 && j % 4 == 0) {
          icon = svgIcon3;
          k = 0;
        } else if (i % 4 == 0 || j % 4 == 0) {
          icon = svgIcon2;
          k = 1;
        }
        markers[k].addLayer(L.marker([z, x], { icon }));
      }
    }
    return markers;
  }

  private setZoomProp(zoom: number) {
    this.zoom = zoom;
    for (const cb of this.zoomChangeCbs)
      cb(zoom);
  }
}
