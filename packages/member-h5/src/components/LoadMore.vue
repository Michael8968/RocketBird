<template>
  <view class="load-more-wrapper">
    <!-- 加载中 -->
    <view class="loading" v-if="loading">
      <view class="loading-icon"></view>
      <text class="loading-text">{{ loadingText }}</text>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-else-if="hasMore" @click="handleLoadMore">
      <text>{{ moreText }}</text>
    </view>

    <!-- 没有更多 -->
    <view class="no-more" v-else-if="showNoMore">
      <text>{{ noMoreText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
export interface LoadMoreProps {
  loading?: boolean;
  hasMore?: boolean;
  showNoMore?: boolean;
  loadingText?: string;
  moreText?: string;
  noMoreText?: string;
}

withDefaults(defineProps<LoadMoreProps>(), {
  loading: false,
  hasMore: true,
  showNoMore: true,
  loadingText: '加载中...',
  moreText: '加载更多',
  noMoreText: '没有更多了',
});

const emit = defineEmits<{
  load: [];
}>();

const handleLoadMore = () => {
  emit('load');
};
</script>

<style lang="scss" scoped>
.load-more-wrapper {
  padding: $spacing-lg 0;

  .loading,
  .load-more,
  .no-more {
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-placeholder;
    font-size: 26rpx;
  }

  .loading {
    .loading-icon {
      width: 32rpx;
      height: 32rpx;
      border: 3rpx solid $border-color;
      border-top-color: $primary-color;
      border-radius: 50%;
      margin-right: $spacing-sm;
      animation: spin 0.8s linear infinite;
    }
  }

  .load-more {
    text {
      padding: 16rpx 32rpx;
      border: 1rpx solid $border-color;
      border-radius: $radius-full;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
