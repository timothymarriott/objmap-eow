import Vue from 'vue';
import { Prop } from 'vue-property-decorator';
import Component, { mixins } from 'vue-class-component';

import MixinUtil from '@/components/MixinUtil';
import { MsgMgr } from '@/services/MsgMgr';
import { ObjectData, ObjectMinData, PlacementLink, RADAR_URL } from '@/services/MapMgr';
import { Settings } from '@/util/settings';
import { EOW_FILES } from '@/util/map';

@Component
export default class ObjectInfo extends mixins(MixinUtil) {
  @Prop()
  private obj!: ObjectData | ObjectMinData | null;

  @Prop()
  private link!: PlacementLink | null;

  @Prop({ type: String, default: 'search-result' })
  private className!: string;

  @Prop({ type: Boolean, default: true })
  private isStatic!: boolean;

  @Prop({ type: Boolean, default: false })
  private dropAsName!: boolean;

  @Prop({ type: Boolean, default: false })
  private withPermalink!: boolean;

  private data!: ObjectData | ObjectMinData;

  private metadata: any | null = null;

  private created() {
    if ((!this.obj && !this.link) || (this.obj && this.link))
      throw new Error('needs an object *or* a placement link');

    if (this.link)
      this.data = this.link.otherObj;
    if (this.obj)
      this.data = this.obj;
  }

  async loadMetaIfNeeded() {
    if (!this.metadata) {
      const rname = this.getRankedUpActorNameForObj(this.data);
      this.metadata = await MsgMgr.getInstance().getObjectMetaData(rname);
    }
  }

  private meta(item: string) {
    this.loadMetaIfNeeded();
    // Return values may still be null if metadata is not available
    return (this.metadata) ? this.metadata[item] : null;
  }


  private name(rankUp: boolean) {
    return this.getName(rankUp ? this.getRankedUpActorNameForObj(this.data) : this.data.name);
  }

  getIcon() {
    return RADAR_URL + "/icon/" + this.data.objid
  }

}
