<template>
  <view class="empty-state">
    <image
      v-if="showImage"
      class="empty-image"
      :src="imageSrc"
      mode="aspectFit"
    />
    <text class="empty-text">{{ text }}</text>
    <button
      v-if="showAction"
      class="empty-action"
      @click="handleAction"
    >
      {{ actionText }}
    </button>
  </view>
</template>

<script setup lang="ts">
export interface EmptyStateProps {
  text?: string;
  imageSrc?: string;
  showImage?: boolean;
  showAction?: boolean;
  actionText?: string;
  actionUrl?: string;
}

const props = withDefaults(defineProps<EmptyStateProps>(), {
  text: '暂无数据',
  imageSrc: '/static/empty.png',
  showImage: true,
  showAction: false,
  actionText: '去看看',
  actionUrl: '',
});

const emit = defineEmits<{
  action: [];
}>();

const handleAction = () => {
  if (props.actionUrl) {
    uni.navigateTo({ url: props.actionUrl });
  } else {
    emit('action');
  }
};
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  color: $text-placeholder;

  .empty-image {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: $spacing-md;
  }

  .empty-text {
    font-size: $font-md;
    text-align: center;
    padding: 0 $spacing-lg;
  }

  .empty-action {
    margin-top: $spacing-lg;
    padding: 16rpx 48rpx;
    font-size: $font-md;
    color: #fff;
    background: $primary-color;
    border-radius: $radius-full;
  }
}
</style>
