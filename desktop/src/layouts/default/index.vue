<template>
  <div v-bind="$attrs" class="app-shell absolute inset-0 flex flex-col">
    <AppHeader class="shell-header" title="Android Control Center">
      <div class="device-picker app-region-no-drag">
        <label for="selected-device" class="sr-only">{{ $t('connection.selector') }}</label>
        <el-select id="selected-device" v-model="selectedId" :aria-label="$t('connection.selector')" :placeholder="$t('connection.choose')" filterable class="w-full">
          <el-option v-for="device in selectorDevices" :key="device.id" class="device-option" :value="device.id" :label="`${device.remark || device.name || device.id} · ${device.id} · ${statusLabel(device.status)}`" :disabled="!deviceStore.list.some(item => item.id === device.id)">
            <span class="device-option-name" :title="device.id">{{ device.remark || device.name || device.id }}<small>{{ device.id }}</small></span>
            <span class="device-option-status">{{ statusLabel(device.status) }}</span>
          </el-option>
        </el-select>
      </div>
    </AppHeader>
    <div class="shell-body">
      <aside class="shell-sidebar">
        <nav :aria-label="$t('connection.navigation')" class="shell-navigation">
          <RouterLink v-for="item in routes" :key="item.path" :to="item.path" :title="$t(item.label)" class="shell-nav-link" active-class="is-active">
            <el-icon aria-hidden="true">
              <component :is="item.icon" />
            </el-icon>
            <span>{{ $t(item.label) }}</span>
          </RouterLink>
        </nav>
        <QuickBar class="shell-quick-actions" />
      </aside>
      <main id="main-content" class="shell-content">
        <RouterView v-slot="{ Component }">
          <keep-alive><component :is="Component" /></keep-alive>
        </RouterView>
      </main>
    </div>
    <AppUpdateDialog />
  </div>
</template>

<script setup>
import AppHeader from '$/components/app-header/index.vue'
import QuickBar from '$/components/quick-bar/index.vue'
import AppUpdateDialog from '$/hooks/use-app-update/dialog.vue'
import { deviceStatus } from '$/dicts/device/index.js'
import { useDeviceConnection } from '$/hooks/use-device-connection/index.js'

defineOptions({ inheritAttrs: false })
const deviceStore = useDeviceStore()
const connection = useDeviceConnection(deviceStore)
provide('refreshDevices', connection.refresh)
const router = useRouter()
const route = useRoute()
const routes = [
  { path: '/device', label: 'menus.device.name', icon: 'Cellphone' },
  { path: '/applications', label: 'apps.title', icon: 'Box' },
  { path: '/preference', label: 'menus.preference.name', icon: 'Setting' },
  { path: '/about', label: 'menus.about.name', icon: 'InfoFilled' },
]
const selectedId = computed({
  get: () => deviceStore.selectedId,
  set: value => deviceStore.selectDevice(value),
})
const selectorDevices = computed(() => {
  const selected = deviceStore.selectedDevice
  return selected && !deviceStore.list.some(device => device.id === selected.id)
    ? [selected, ...deviceStore.list]
    : deviceStore.list
})
function statusLabel(status) {
  const item = deviceStatus.find(item => item.value === status)
  return window.t(item?.label || 'connection.unavailable')
}
const activeTab = computed({ get: () => route.path, set: value => router.push(value) })
provide('activeTab', activeTab)
</script>

<style scoped>
.app-shell {
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
}
.shell-header {
  flex: none;
  min-height: 52px;
  padding-block: 8px;
  padding-inline-start: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.device-picker {
  width: min(100%, 330px);
  padding-inline: 12px;
}
.device-option-name {
  display: inline-block;
  max-width: 72%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.device-option-status {
  float: right;
  margin-inline-start: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.device-option {
  height: auto;
  min-height: 54px;
}
.device-option-name small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1.4;
}
.shell-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.shell-sidebar {
  display: flex;
  flex-direction: column;
  flex: 0 0 152px;
  min-width: 0;
  padding: 12px 8px;
  border-inline-end: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}
.shell-navigation {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.shell-nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 6px;
  color: inherit;
  text-decoration: none;
}
.shell-nav-link:hover {
  background: var(--el-fill-color-light);
}
.shell-nav-link.is-active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-weight: 600;
}
.shell-nav-link:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.shell-quick-actions {
  margin-top: auto;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 16px;
}
.shell-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}
@media (max-width: 850px) {
  .shell-sidebar {
    flex-basis: 56px;
    padding-inline: 6px;
  }
  .shell-nav-link {
    justify-content: center;
    padding-inline: 6px;
  }
  .shell-nav-link span:not(.el-icon) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .shell-content {
    padding: 12px;
  }
  .shell-quick-actions {
    justify-content: center;
  }
}
@media (max-width: 650px) {
  .shell-header :deep(.text-sm.font-semibold) {
    max-width: 130px;
  }
  .device-picker {
    padding-inline: 0;
  }
}
</style>
