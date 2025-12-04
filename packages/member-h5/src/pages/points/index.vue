<template>
  <view class="points-page">
    <!-- 积分卡片 -->
    <view class="points-card">
      <view class="points-info">
        <text class="label">可用积分</text>
        <text class="value">{{ availablePoints }}</text>
      </view>
      <view class="actions">
        <view class="action-btn" @click="navigateTo('/pages/points/records')">
          <text>积分明细</text>
        </view>
        <view class="action-btn primary" @click="navigateTo('/pages/points/mall')">
          <text>去兑换</text>
        </view>
      </view>
    </view>

    <!-- 积分获取方式 -->
    <view class="section">
      <text class="section-title">赚取积分</text>
      <view class="earn-list">
        <ListItem
          icon-background="linear-gradient(135deg, #52c41a, #73d13d)"
          title="打卡分享"
          desc="每次打卡可获得积分"
          right-text="+10"
          :right-text-color="primaryColor"
          url="/pages/checkin/index"
        />
        <ListItem
          icon-background="linear-gradient(135deg, #1890ff, #40a9ff)"
          title="推荐好友"
          desc="邀请好友注册得积分"
          right-text="+100"
          :right-text-color="primaryColor"
          url="/pages/referral/index"
        />
      </view>
    </view>

    <!-- 热门兑换 -->
    <view class="section">
      <SectionHeader
        title="热门兑换"
        show-more
        more-text="更多"
        more-url="/pages/points/mall"
      />
      <view class="product-grid">
        <view
          class="product-item"
          v-for="product in hotProducts"
          :key="product.productId"
          @click="goProductDetail(product.productId)"
        >
          <image class="product-image" :src="product.coverImage" mode="aspectFill" />
          <text class="product-name">{{ product.name }}</text>
          <view class="product-price">
            <text class="points">{{ product.pointsCost }}</text>
            <text class="unit">积分</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';
import { pointsApi } from '@/api';
import { SectionHeader, ListItem } from '@/components';
import type { IPointsProduct } from '@rocketbird/shared';

const primaryColor = '#FF6B35';

const userStore = useUserStore();
const availablePoints = computed(() => userStore.userInfo?.availablePoints || 0);

const hotProducts = ref<IPointsProduct[]>([]);

const navigateTo = (url: string) => {
  uni.navigateTo({ url });
};

const goProductDetail = (productId: string) => {
  uni.navigateTo({ url: `/pages/points/mall?id=${productId}` });
};

const loadProducts = async () => {
  try {
    const res = await pointsApi.getMallProducts({ page: 1, pageSize: 4 });
    hotProducts.value = res.list;
  } catch (error) {
    console.error('加载商品失败', error);
  }
};

onShow(() => {
  loadProducts();
});
</script>

<style lang="scss" scoped>
.points-page {
  min-height: 100vh;
  background: $bg-color;
  padding-bottom: 120rpx;
}

.points-card {
  background: linear-gradient(135deg, $primary-color, $primary-light);
  margin: $spacing-md;
  padding: 40rpx;
  border-radius: $radius-lg;
  color: #fff;

  .points-info {
    text-align: center;
    margin-bottom: $spacing-lg;

    .label {
      display: block;
      font-size: $font-md;
      opacity: 0.9;
    }

    .value {
      display: block;
      font-size: 72rpx;
      font-weight: 600;
      margin-top: $spacing-xs;
    }
  }

  .actions {
    display: flex;
    gap: $spacing-md;

    .action-btn {
      flex: 1;
      height: 72rpx;
      line-height: 72rpx;
      text-align: center;
      border-radius: $radius-full;
      font-size: $font-md;
      background: rgba(255, 255, 255, 0.2);

      &.primary {
        background: #fff;
        color: $primary-color;
      }
    }
  }
}

.section {
  background: #fff;
  margin: $spacing-md;
  padding: $spacing-md;
  border-radius: $radius-lg;

  .section-title {
    font-size: $font-lg;
    font-weight: 500;
    color: $text-color;
    margin-bottom: $spacing-md;
  }
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-md;

  .product-item {
    width: calc(50% - 12rpx);

    .product-image {
      width: 100%;
      height: 240rpx;
      border-radius: $radius-md;
    }

    .product-name {
      display: block;
      margin-top: 12rpx;
      font-size: $font-md;
      color: $text-color;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .product-price {
      margin-top: $spacing-xs;

      .points {
        font-size: $font-lg;
        font-weight: 500;
        color: $primary-color;
      }

      .unit {
        font-size: $font-sm;
        color: $text-secondary;
        margin-left: 4rpx;
      }
    }
  }
}
</style>
