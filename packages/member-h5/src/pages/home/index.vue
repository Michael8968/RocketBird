<template>
  <view class="home-page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info" @click="handleUserClick">
        <image class="avatar" :src="userInfo?.avatar || '/static/default-avatar.svg'" mode="aspectFill" />
        <view class="info">
          <text class="nickname">{{ userInfo?.nickname || '点击登录' }}</text>
          <view class="level-badge" v-if="userInfo">
            <text>{{ userInfo.levelName }}</text>
          </view>
        </view>
      </view>
      <view class="stats" v-if="userInfo">
        <view class="stat-item">
          <text class="value">{{ userInfo.availablePoints }}</text>
          <text class="label">可用积分</text>
        </view>
        <view class="stat-item">
          <text class="value">{{ userInfo.growthValue }}</text>
          <text class="label">成长值</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-entry">
      <view class="entry-item" @click="navigateTo('/pages/points/mall')">
        <image src="/static/icons/mall.png" />
        <text>积分商城</text>
      </view>
      <view class="entry-item" @click="navigateTo('/pages/checkin/index')">
        <image src="/static/icons/checkin.png" />
        <text>打卡分享</text>
      </view>
      <view class="entry-item" @click="navigateTo('/pages/meals/index')">
        <image src="/static/icons/meals.png" />
        <text>健身餐</text>
      </view>
      <view class="entry-item" @click="navigateTo('/pages/referral/index')">
        <image src="/static/icons/referral.png" />
        <text>推荐好友</text>
      </view>
    </view>

    <!-- 轮播图 -->
    <view class="banner-section" v-if="banners.length">
      <swiper class="banner-swiper" indicator-dots autoplay circular>
        <swiper-item v-for="banner in banners" :key="banner.bannerId">
          <image class="banner-image" :src="banner.image" mode="aspectFill" @click="handleBannerClick(banner)" />
        </swiper-item>
      </swiper>
    </view>

    <!-- 推荐内容 -->
    <view class="section">
      <SectionHeader
        title="推荐健身餐"
        show-more
        more-url="/pages/meals/index"
      />
      <scroll-view class="meal-list" scroll-x>
        <view class="meal-item" v-for="meal in recommendedMeals" :key="meal.mealId" @click="goMealDetail(meal.mealId)">
          <image class="meal-cover" :src="meal.coverImage" mode="aspectFill" />
          <text class="meal-name">{{ meal.name }}</text>
          <text class="meal-calories">{{ meal.calories }}千卡</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';
import { SectionHeader } from '@/components';
import type { IBanner, IFitnessMeal } from '@rocketbird/shared';

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

const banners = ref<IBanner[]>([]);
const recommendedMeals = ref<IFitnessMeal[]>([]);

const handleUserClick = () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
  } else {
    uni.navigateTo({ url: '/pages/mine/index' });
  }
};

const navigateTo = (url: string) => {
  uni.navigateTo({ url });
};

const handleBannerClick = (banner: IBanner) => {
  if (banner.linkUrl) {
    // 处理跳转
  }
};

const goMealDetail = (mealId: string) => {
  uni.navigateTo({ url: `/pages/meals/detail?id=${mealId}` });
};

const loadData = async () => {
  // TODO: 加载首页数据
};

onMounted(() => {
  userStore.init();
});

onShow(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  padding-bottom: 120rpx;
}

.user-card {
  background: linear-gradient(135deg, $primary-color, $primary-light);
  padding: 40rpx $spacing-lg;
  color: #fff;

  .user-info {
    display: flex;
    align-items: center;
    margin-bottom: $spacing-lg;

    .avatar {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      border: 4rpx solid rgba(255, 255, 255, 0.3);
    }

    .info {
      margin-left: $spacing-md;

      .nickname {
        font-size: $font-xl;
        font-weight: 500;
      }

      .level-badge {
        display: inline-block;
        margin-top: $spacing-xs;
        padding: 4rpx $spacing-sm;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 20rpx;
        font-size: $font-sm;
      }
    }
  }

  .stats {
    display: flex;

    .stat-item {
      flex: 1;
      text-align: center;

      .value {
        display: block;
        font-size: 40rpx;
        font-weight: 600;
      }

      .label {
        font-size: $font-sm;
        opacity: 0.8;
      }
    }
  }
}

.quick-entry {
  display: flex;
  background: #fff;
  padding: $spacing-lg 0;

  .entry-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    image {
      width: 80rpx;
      height: 80rpx;
      margin-bottom: 12rpx;
    }

    text {
      font-size: $font-sm;
      color: $text-color;
    }
  }
}

.banner-section {
  margin: $spacing-md $spacing-lg;

  .banner-swiper {
    height: 280rpx;
    border-radius: $radius-lg;
    overflow: hidden;

    .banner-image {
      width: 100%;
      height: 100%;
    }
  }
}

.section {
  margin: $spacing-md $spacing-lg;
  background: #fff;
  border-radius: $radius-lg;
  padding: $spacing-md;

  .meal-list {
    white-space: nowrap;

    .meal-item {
      display: inline-block;
      width: 240rpx;
      margin-right: $spacing-md;

      .meal-cover {
        width: 240rpx;
        height: 180rpx;
        border-radius: $radius-md;
      }

      .meal-name {
        display: block;
        margin-top: 12rpx;
        font-size: $font-md;
        color: $text-color;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .meal-calories {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }
  }
}
</style>
