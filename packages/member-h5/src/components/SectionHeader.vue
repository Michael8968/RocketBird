<template>
  <view class="section-header">
    <text class="title">{{ title }}</text>
    <text class="more" v-if="showMore" @click="handleMore">{{ moreText }}</text>
  </view>
</template>

<script setup lang="ts">
export interface SectionHeaderProps {
  title: string;
  showMore?: boolean;
  moreText?: string;
  moreUrl?: string;
}

const props = withDefaults(defineProps<SectionHeaderProps>(), {
  showMore: false,
  moreText: '查看更多',
  moreUrl: '',
});

const emit = defineEmits<{
  more: [];
}>();

const handleMore = () => {
  if (props.moreUrl) {
    uni.navigateTo({ url: props.moreUrl });
  } else {
    emit('more');
  }
};
</script>

<style lang="scss" scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;

  .title {
    font-size: $font-lg;
    font-weight: 500;
    color: $text-color;
  }

  .more {
    font-size: 26rpx;
    color: $text-secondary;
  }
}
</style>
