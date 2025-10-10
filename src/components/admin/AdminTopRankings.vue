<script setup lang="ts">
import { computed } from 'vue'
import {
  ElRow,
  ElCol,
  ElCard,
  ElEmpty,
  ElSkeleton,
  ElProgress,
  ElTooltip,
  ElIcon,
  ElTag
} from 'element-plus'
import {
  Monitor,
  Location,
  Position,
  Trophy,
  Right,
  More
} from '@element-plus/icons-vue'
import { useI18n } from '@/composables/useI18n'
import type { AdminRankingResponse, RankingItem } from 'shared/types/admin'

// Props
const props = defineProps<{
  data: AdminRankingResponse | null
  loading?: boolean
}>()

// Emits
const emit = defineEmits<{
  rankingClick: [type: 'ip' | 'country' | 'region', item: RankingItem]
}>()

const { t } = useI18n()

// Ranking configurations
const rankingConfigs = computed(() => [
  {
    key: 'topIps',
    type: 'ip' as const,
    title: t('admin.rankings.topIPs'),
    icon: Monitor,
    color: '#409EFF',
    emptyText: t('admin.rankings.noIPs'),
    items: props.data?.topIps || []
  },
  {
    key: 'topCountries',
    type: 'country' as const,
    title: t('admin.rankings.topCountries'),
    icon: Location,
    color: '#67C23A',
    emptyText: t('admin.rankings.noCountries'),
    items: props.data?.topCountries || []
  },
  {
    key: 'topRegions',
    type: 'region' as const,
    title: t('admin.rankings.topRegions'),
    icon: Position,
    color: '#E6A23C',
    emptyText: t('admin.rankings.noRegions'),
    items: props.data?.topRegions || []
  }
])

// Calculate max count for percentage calculation
const getMaxCount = (items: RankingItem[]): number => {
  if (!items || items.length === 0) return 0
  return Math.max(...items.map(item => item.count))
}

// Calculate percentage for progress bar
const calculatePercentage = (count: number, maxCount: number): number => {
  if (maxCount === 0) return 0
  return Math.round((count / maxCount) * 100)
}

// Format count number
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}

// Get ranking medal color based on position
const getRankingColor = (index: number): string => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#409EFF', '#909399']
  return colors[index] || '#909399'
}

// Get ranking medal icon
const getRankingIcon = (index: number) => {
  if (index < 3) return Trophy
  return More
}

// Handle ranking item click
const handleItemClick = (type: 'ip' | 'country' | 'region', item: RankingItem) => {
  emit('rankingClick', type, item)
}

// Truncate long text
const truncateText = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
</script>

<template>
  <div class="admin-top-rankings">
    <el-row :gutter="16">
      <el-col
        v-for="config in rankingConfigs"
        :key="config.key"
        :xs="24"
        :sm="24"
        :md="8"
        :lg="8"
        :xl="8"
        class="ranking-column"
      >
        <el-card class="ranking-card" shadow="hover">
          <!-- Card Header -->
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <el-icon :color="config.color" :size="18">
                  <component :is="config.icon" />
                </el-icon>
                <span class="header-title">{{ config.title }}</span>
              </div>
              <el-tag size="small" type="info">
                TOP {{ config.items.length }}
              </el-tag>
            </div>
          </template>

          <!-- Loading State -->
          <div v-if="loading" class="loading-skeleton">
            <el-skeleton animated>
              <template #template>
                <div
                  v-for="i in 5"
                  :key="i"
                  class="skeleton-item"
                >
                  <div class="skeleton-row">
                    <div class="skeleton-rank" />
                    <div class="skeleton-content">
                      <div class="skeleton-text" />
                      <div class="skeleton-progress" />
                    </div>
                    <div class="skeleton-count" />
                  </div>
                </div>
              </template>
            </el-skeleton>
          </div>

          <!-- Empty State -->
          <div v-else-if="!config.items || config.items.length === 0" class="empty-state">
            <el-empty
              :description="config.emptyText"
              :image-size="60"
            />
          </div>

          <!-- Ranking List -->
          <div v-else class="ranking-list">
            <div
              v-for="(item, index) in config.items"
              :key="`${item.name}-${index}`"
              class="ranking-item"
              @click="handleItemClick(config.type, item)"
            >
              <!-- Ranking Position -->
              <div class="item-rank">
                <el-tooltip
                  :content="`${t('admin.rankings.rank')} #${index + 1}`"
                  placement="left"
                >
                  <div class="rank-badge" :style="{ color: getRankingColor(index) }">
                    <el-icon :size="16">
                      <component :is="getRankingIcon(index)" />
                    </el-icon>
                    <span class="rank-number">{{ index + 1 }}</span>
                  </div>
                </el-tooltip>
              </div>

              <!-- Item Content -->
              <div class="item-content">
                <!-- Name and Progress -->
                <div class="content-main">
                  <div class="item-info">
                    <el-tooltip
                      v-if="item.name.length > 20"
                      :content="item.name"
                      placement="top"
                    >
                      <span class="item-name">{{ truncateText(item.name) }}</span>
                    </el-tooltip>
                    <span v-else class="item-name">{{ item.name }}</span>

                    <span class="item-count">{{ formatCount(item.count) }}</span>
                  </div>

                  <!-- Progress Bar -->
                  <div class="progress-container">
                    <el-progress
                      :percentage="calculatePercentage(item.count, getMaxCount(config.items))"
                      :color="config.color"
                      :stroke-width="6"
                      :show-text="false"
                      class="item-progress"
                    />
                    <span class="progress-text">
                      {{ calculatePercentage(item.count, getMaxCount(config.items)) }}%
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action Arrow -->
              <div class="item-action">
                <el-icon class="action-arrow">
                  <Right />
                </el-icon>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.admin-top-rankings {
  width: 100%;
}

.ranking-column {
  margin-bottom: 16px;
}

/* Card Styling */
.ranking-card {
  height: 100%;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
}

.ranking-card:hover {
  border-color: var(--el-color-primary-light-7);
  box-shadow: var(--el-box-shadow);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* Loading Skeleton */
.loading-skeleton {
  padding: 8px 0;
}

.skeleton-item {
  margin-bottom: 12px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-border-color-lighter);
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-text {
  height: 14px;
  background: var(--el-border-color-lighter);
  border-radius: 4px;
  width: 70%;
}

.skeleton-progress {
  height: 6px;
  background: var(--el-border-color-lighter);
  border-radius: 3px;
  width: 100%;
}

.skeleton-count {
  width: 40px;
  height: 14px;
  background: var(--el-border-color-lighter);
  border-radius: 4px;
}

/* Empty State */
.empty-state {
  padding: 20px 0;
  text-align: center;
}

/* Ranking List */
.ranking-list {
  padding: 4px 0;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.ranking-item:hover {
  background: var(--el-bg-color-page);
  border-color: var(--el-border-color);
}

.ranking-item:active {
  transform: translateY(1px);
}

/* Ranking Position */
.item-rank {
  flex-shrink: 0;
}

.rank-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 32px;
}

.rank-number {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

/* Item Content */
.item-content {
  flex: 1;
  min-width: 0;
}

.content-main {
  width: 100%;
}

.item-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.item-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
}

/* Progress */
.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-progress {
  flex: 1;
}

.progress-text {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  min-width: 32px;
  text-align: right;
}

/* Action Arrow */
.item-action {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.ranking-item:hover .item-action {
  opacity: 1;
}

.action-arrow {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .ranking-column {
    margin-bottom: 12px;
  }

  .ranking-item {
    padding: 10px 6px;
    gap: 10px;
  }

  .rank-badge {
    min-width: 28px;
  }

  .rank-number {
    font-size: 11px;
  }

  .item-name {
    font-size: 12px;
  }

  .item-count {
    font-size: 11px;
  }

  .progress-text {
    font-size: 10px;
    min-width: 28px;
  }
}

@media (max-width: 480px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .ranking-item {
    padding: 8px 4px;
    gap: 8px;
  }

  .rank-badge {
    min-width: 24px;
  }

  .item-info {
    margin-bottom: 4px;
  }

  .progress-container {
    gap: 6px;
  }

  .progress-text {
    min-width: 24px;
  }
}

/* Animation */
.admin-top-rankings {
  animation: fadeIn 0.3s ease-out;
}

.ranking-item {
  animation: slideIn 0.2s ease-out;
  animation-fill-mode: both;
}

.ranking-item:nth-child(1) { animation-delay: 0ms; }
.ranking-item:nth-child(2) { animation-delay: 50ms; }
.ranking-item:nth-child(3) { animation-delay: 100ms; }
.ranking-item:nth-child(4) { animation-delay: 150ms; }
.ranking-item:nth-child(5) { animation-delay: 200ms; }

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Focus states for accessibility */
.ranking-item:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
