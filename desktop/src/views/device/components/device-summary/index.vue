<template>
  <section class="device-summary" :aria-busy="infoLoading" aria-labelledby="device-overview-title">
    <div class="summary-heading">
      <div class="summary-identity">
        <h1 id="device-overview-title">
          {{ selected ? selected.remark || selected.name || $t('connection.unknownDevice') : $t('connection.emptyTitle') }}
        </h1>
        <p v-if="selected" class="summary-serial">
          {{ selected.id }}
        </p>
      </div>
      <el-tag v-if="selected" :type="statusItem?.tagType || 'info'" effect="plain">
        {{ $t(statusItem?.label || 'connection.unavailable') }}
      </el-tag>
      <el-button v-if="selected" type="primary" icon="Monitor" :disabled="!ready" :loading="mirroring" @click="mirrorSelected">
        {{ $t('connection.mirror') }}
      </el-button>
    </div>
    <p v-if="connectionHint" class="connection-hint" role="status">
      {{ $t(connectionHint) }}
    </p>
    <template v-else>
      <p v-if="infoError" class="connection-hint" role="status">
        {{ $t('connection.infoError') }}
      </p>
      <p v-if="infoLoading" class="summary-loading" role="status">
        {{ $t('connection.loadingInfo') }}
      </p>
      <dl v-else class="summary-metrics">
        <div><dt>{{ $t('connection.model') }}</dt><dd>{{ info?.model || $t('connection.unavailable') }}</dd></div>
        <div><dt>{{ $t('connection.android') }}</dt><dd>{{ info?.androidVersion || $t('connection.unavailable') }}</dd></div>
        <div><dt>{{ $t('device.battery') }}</dt><dd>{{ info?.batteryPercentage != null ? `${info.batteryPercentage}%` : $t('connection.unavailable') }}<span v-if="info?.charging"> · {{ $t('connection.charging') }}</span></dd></div>
        <div><dt>{{ $t('connection.screen') }}</dt><dd>{{ info?.screenWidth ? `${info.screenWidth} × ${info.screenHeight}` : $t('connection.unavailable') }}</dd></div>
      </dl>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { deviceStatus } from '$/dicts/device/index.js'
import { useDeviceInfo } from '$/hooks/use-device-info/index.js'
import { useMirrorAction } from '$/hooks/use-mirror-action/index.js'

const store = useDeviceStore()
const { selectedDevice: selected, selectedReady: ready, error } = storeToRefs(store)
const { data: info, loading: infoLoading, error: infoError } = useDeviceInfo(selected, ready)
const { loading: mirroring, invoke: mirror } = useMirrorAction()
const statusItem = computed(() => deviceStatus.find(item => item.value === selected.value?.status))
const connectionHint = computed(() => {
  if (error.value)
    return 'connection.serviceError'
  if (!selected.value)
    return 'connection.setup'
  if (selected.value.status === 'unauthorized')
    return 'connection.authorize'
  if (!['device', 'emulator'].includes(selected.value.status))
    return 'connection.offline'
  return ''
})
function mirrorSelected() {
  if (ready.value) {
    mirror(selected.value.id)
  }
}
</script>

<style scoped>
.device-summary {
  flex: none;
  padding-bottom: 16px;
}
.summary-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.summary-identity {
  flex: 1;
  min-width: 120px;
}
h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.4;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.summary-serial {
  margin: 2px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.connection-hint,
.summary-loading {
  margin: 12px 0 0;
  max-width: 70ch;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0 0;
}
dt {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-bottom: 3px;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 700px) {
  .summary-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
