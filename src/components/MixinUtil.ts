import Vue from 'vue';
import Component from 'vue-class-component';

import { ObjectMinData } from '@/services/MapMgr';
import { MsgMgr } from '@/services/MsgMgr';
import { Settings } from '@/util/settings';

@Component
export default class MixinUtil extends Vue {
  getName(name: string) {
    if (Settings.getInstance().useActorNames)
      return name;
    return MsgMgr.getInstance().getName(name) || name;
  }


  getRankedUpActorNameForObj(obj: ObjectMinData) {
    return obj.name;
  }

  getMapNameForObj(obj: ObjectMinData) {
    return obj.map_name;
  }

  isActuallyRankedUp(obj: ObjectMinData) {
    return this.getRankedUpActorNameForObj(obj) != obj.name;
  }

  formatObjId(id: number) {
    if (!Settings.getInstance().useHexForHashIds)
      return id.toString(10);
    return '0x' + id.toString(16).padStart(8, '0');
  }
}
