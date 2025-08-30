<template>
  <div>
    <div v-if="staticData.history.length" style="right: 40px" class="leaflet-sidebar-close" @click.stop.prevent="goBack()" v-b-tooltip.hover title="Go back to previous object"><i class="fa fa-arrow-left"></i></div>

    <h2 class="location-sub" v-if="getLocationSub()">{{getLocationSub()}}</h2>
    <ObjectInfo :obj="minObj" :key="minObj.objid" className="obj-main-info" withPermalink />

    <section v-if="obj" class="mt-2">
      <section>Actor: {{obj.data.UnitConfigName}}</section>
      <section>Position: {{obj.translate.x.toFixed(2)}}, {{obj.translate.y.toFixed(2)}}, {{obj.translate.z.toFixed(2)}}</section>
      <!-- <section v-if="obj.data.Scale != null">Scale: {{arrayOrNumToStr(obj.data.Scale, 2)}}</section> -->
      <!-- <section v-if="obj.data.Rotate != null">Rotate: {{arrayOrNumToStr(obj.data.Rotate, 5)}}</section>
      <section v-if="obj.data.UniqueName">Unique name: {{obj.data.UniqueName}}</section> -->

      <p v-if="isAreaReprPossiblyWrong()"><i class="fa fa-exclamation-circle"></i> Area representation may be inaccurate because of rotation parameters.</p>

      <section class="mt-2" v-show="areaMarkers.length || staticData.persistentAreaMarkers.length">
        <b-btn v-show="areaMarkers.length" size="sm" block variant="dark" @click="keepAreaMarkersAlive()">Keep area representation loaded</b-btn>
        <b-btn v-show="staticData.persistentAreaMarkers.length" size="sm" block variant="dark" @click="forgetPersistentAreaMarkers()">Hide area representation</b-btn>
      </section>

      <section v-if="obj.params">
        <hr>
        <h4 class="subsection-heading">Parameters</h4>
        <pre class="obj-params">{{JSON.stringify(obj.params, undefined, 2)}}</pre>
      </section>

      <section v-if="obj.conditions.length > 0">
        <hr>
        <h4 class="subsection-heading">Conditions</h4>
        <pre class="obj-conditions">{{JSON.stringify(obj.conditions, undefined, 2)}}</pre>
      </section>

    </section>

    <section v-if="isSearchResult()">
      <br>
      <b-btn size="sm" block @click="emitBackToSearch()"><i class="fa fa-chevron-circle-left"></i> Back to search</b-btn>
    </section>
  </div>
</template>
<style lang="less">
.obj-main-info {
  font-size: 90%;
  .search-result-name {
    display: none;
  }
}

.obj-params {
  color: #dcdcdc;
}

.obj-conditions {
  color: #dcdcdc;
}

.stump {
    width: 30px;
    height: 30px;
    content: "";
    border: 4px solid #733900;
    border-radius: 50%;
    padding: 15%;
    background: #DAA96A;
    position: relative;
}
.big-leaf {
  color: #C95A2A;
  font-size: 1.2em;
  top: 50%;
  left: 50%;
  transform: translate(-60%, -50%) rotate(-45deg) ;
  position: absolute;
}

</style>
<script src="./AppMapDetailsObj.ts"></script>
