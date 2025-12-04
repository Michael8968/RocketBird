<template>
  <view class="stat-card" :style="{ background: gradient }">
    <view class="stat-item" v-for="(stat, index) in stats" :key="index">
      <text class="value">{{ stat.value }}</text>
      <text class="label">{{ stat.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
export interface StatItem {
  value: string | number;
  label: string;
}

export interface StatCardProps {
  stats: StatItem[];
  gradient?: string;
}

withDefaults(defineProps<StatCardProps>(), {
  gradient: 'linear-gradient(135deg, #FF6B35, #FF8A5B)',
});
</script>

<style lang="scss" scoped>
.stat-card {
  display: flex;
  margin: $spacing-md;
  padding: 40rpx;
  border-radius: $radius-lg;
  color: #fff;

  .stat-item {
    flex: 1;
    text-align: center;

    .value {
      display: block;
      font-size: $font-xxl;
      font-weight: 600;
    }

    .label {
      display: block;
      font-size: $font-sm;
      opacity: 0.9;
      margin-top: $spacing-xs;
    }
  }
}
</style>
