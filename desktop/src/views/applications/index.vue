<template>
  <section class="application-library h-full flex flex-col min-h-0">
    <header class="library-heading">
      <div>
        <h1>{{ $t('apps.title') }}</h1>
        <p>{{ selected?.remark || selected?.name || selected?.id || $t('connection.choose') }}</p>
        <p v-if="selected && (selected.remark || selected.name)">
          {{ selected.id }}
        </p>
      </div>
      <el-button icon="Refresh" :loading="loading" :disabled="busy" @click="refreshLibrary">
        {{ $t('common.refresh') }}
      </el-button>
    </header>
    <p v-if="!ready" class="library-message" role="status">
      {{ $t('apps.connectHint') }}
    </p>
    <template v-else>
      <div class="library-filters">
        <label class="user-filter">
          <span>{{ $t('apps.user') }}</span>
          <el-select :model-value="userId" :aria-label="$t('apps.user')" :disabled="busy || loading" @change="selectUser">
            <el-option v-for="user in users" :key="user.id" :value="user.id" :label="`${user.name || $t('apps.user')} (${user.id})`" />
          </el-select>
        </label>
        <el-input v-model="search" clearable :aria-label="$t('apps.search')" :placeholder="$t('apps.search')" prefix-icon="Search" class="package-search" />
        <el-select v-model="typeFilter" :aria-label="$t('apps.type')" class="type-filter">
          <el-option v-for="type in ['all', 'userApps', 'systemApps']" :key="type" :value="type" :label="$t(`apps.${type}`)" />
        </el-select>
        <el-select v-model="statusFilter" :aria-label="$t('apps.status')" class="type-filter">
          <el-option v-for="status in ['all', 'enabled', 'disabled']" :key="status" :value="status" :label="$t(`apps.${status}`)" />
        </el-select>
      </div>
      <el-alert v-if="error" type="error" :closable="false" show-icon class="mb-3" :title="error" />
      <p v-if="notice" role="status" class="library-message">
        {{ $t(notice.status === 'cancelled' ? 'apps.cancelled' : 'apps.completed') }} · {{ notice.packageName }}
      </p>
      <p v-if="busy" role="status" class="library-message">
        {{ $t('apps.working') }}
      </p>
      <p class="library-policy">
        {{ $t('apps.systemProtected') }}
      </p>
      <p class="library-count" role="status">
        {{ $t('apps.count', { shown: filteredPackages.length, total: packages.length }) }}
      </p>
      <div class="flex-1 min-h-40">
        <el-table v-loading="loading" :element-loading-text="$t('common.loading')" :data="filteredPackages" height="100%" row-key="packageName" class="el-table--beautify">
          <el-table-column :label="$t('apps.package')" prop="packageName" min-width="270" show-overflow-tooltip sortable>
            <template #default="{ row }">
              <span class="package-identity"><el-icon aria-hidden="true"><Box /></el-icon>{{ row.packageName }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('apps.version')" prop="versionCode" min-width="110" show-overflow-tooltip />
          <el-table-column :label="$t('apps.type')" min-width="100">
            <template #default="{ row }">
              {{ $t(row.system ? 'apps.systemApps' : 'apps.userApps') }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('apps.status')" min-width="95">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" effect="plain">
                {{ $t(row.enabled ? 'apps.enabled' : 'apps.disabled') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.actions')" min-width="280">
            <template #default="{ row }">
              <el-button size="small" :disabled="actionsPaused || !row.enabled" @click="perform(row.packageName, 'launch')">
                {{ $t('apps.open') }}
              </el-button>
              <el-button size="small" :disabled="actionsPaused || !row.userInstalled || row.system" @click="perform(row.packageName, 'force-stop')">
                {{ $t('apps.stop') }}
              </el-button>
              <el-button size="small" type="danger" plain :disabled="actionsPaused || !row.userInstalled || row.system" @click="perform(row.packageName, 'uninstall')">
                {{ $t('apps.uninstall') }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <p>{{ $t(error ? 'apps.loadError' : packages.length ? 'apps.noMatches' : 'apps.empty') }}</p>
          </template>
        </el-table>
      </div>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useApplications } from '$/hooks/use-applications/index.js'

const store = useDeviceStore()
const { selectedDevice: selected, selectedReady: ready } = storeToRefs(store)
const { users, userId, packages, loading, busy, error, notice, refresh, selectUser, perform } = useApplications(selected, ready)
const refreshDevices = inject('refreshDevices')
const search = ref('')
const typeFilter = ref('all')
const statusFilter = ref('all')
const actionsPaused = computed(() => !ready.value || loading.value || busy.value || Boolean(error.value))
const filteredPackages = computed(() => {
  const query = search.value.trim().toLowerCase()
  return packages.value.filter(item => item.packageName.toLowerCase().includes(query)
    && (typeFilter.value === 'all' || (typeFilter.value === 'systemApps' ? item.system : item.userInstalled))
    && (statusFilter.value === 'all' || (statusFilter.value === 'enabled' ? item.enabled : !item.enabled)))
})
async function refreshLibrary() {
  if (!ready.value)
    await refreshDevices()
  else
    await refresh()
}
</script>

<style scoped>
.library-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.4;
  font-weight: 600;
}
.library-heading p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}
.library-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
  margin-bottom: 14px;
}
.user-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 190px;
  font-size: 12px;
}
.package-search {
  flex: 1;
  min-width: 200px;
}
.type-filter {
  width: 150px;
}
.library-message {
  margin: 0 0 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.library-policy,
.library-count {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.package-identity {
  display: flex;
  align-items: center;
  gap: 8px;
}
.package-identity .el-icon {
  flex: none;
}
@media (max-width: 850px) {
  .library-heading {
    align-items: start;
  }
  .user-filter,
  .type-filter {
    width: 160px;
  }
}
</style>
