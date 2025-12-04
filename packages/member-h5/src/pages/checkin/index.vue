<template>
  <view class="checkin-page">
    <!-- 打卡统计 -->
    <StatCard
      :stats="statItems"
      gradient="linear-gradient(135deg, #52c41a, #73d13d)"
    />

    <!-- 打卡主题 -->
    <view class="section">
      <text class="section-title">选择打卡主题</text>
      <view class="theme-list">
        <ListItem
          v-for="theme in themes"
          :key="theme.themeId"
          :icon-image="theme.coverImage"
          icon-size="120rpx"
          :title="theme.name"
          :right-text="`+${theme.rewardPoints}积分`"
          :right-text-color="primaryColor"
          @click="selectTheme(theme)"
        />
      </view>
    </view>

    <!-- 我的打卡 -->
    <view class="section">
      <SectionHeader
        title="我的打卡"
        show-more
        more-text="全部记录"
        more-url="/pages/checkin/records"
      />
      <view class="record-list" v-if="records.length">
        <view
          class="record-item"
          v-for="record in records"
          :key="record.recordId"
          @click="goRecordDetail(record.recordId)"
        >
          <image
            class="record-image"
            :src="record.images[0]"
            mode="aspectFill"
            v-if="record.images.length"
          />
          <view class="record-info">
            <text class="record-theme">{{ record.themeName }}</text>
            <text class="record-content">{{ record.content || '暂无内容' }}</text>
            <text class="record-time">{{ formatDate(record.createdAt) }}</text>
          </view>
          <view class="record-status" :class="{ shared: record.isShared }">
            {{ record.isShared ? '已分享' : '未分享' }}
          </view>
        </view>
      </view>
      <EmptyState
        v-else
        text="暂无打卡记录，快去打卡吧~"
        :show-image="false"
      />
    </view>

    <!-- 立即打卡按钮 -->
    <view class="bottom-bar">
      <button class="checkin-btn" @click="goCreateCheckin">立即打卡</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { checkinApi } from '@/api';
import { formatDate } from '@rocketbird/shared';
import { StatCard, SectionHeader, ListItem, EmptyState } from '@/components';
import type { ICheckinTheme, ICheckinRecord } from '@rocketbird/shared';

const primaryColor = '#FF6B35';

const stats = ref({
  totalCheckins: 0,
  continuousDays: 0,
  totalPoints: 0,
});

const statItems = computed(() => [
  { value: stats.value.totalCheckins, label: '累计打卡' },
  { value: stats.value.continuousDays, label: '连续打卡' },
  { value: stats.value.totalPoints, label: '获得积分' },
]);

const themes = ref<ICheckinTheme[]>([]);
const records = ref<ICheckinRecord[]>([]);

const selectTheme = (theme: ICheckinTheme) => {
  uni.navigateTo({ url: `/pages/checkin/create?themeId=${theme.themeId}` });
};

const goCreateCheckin = () => {
  uni.navigateTo({ url: '/pages/checkin/create' });
};

const goRecordDetail = (recordId: string) => {
  uni.navigateTo({ url: `/pages/checkin/records?id=${recordId}` });
};

const loadData = async () => {
  try {
    // 加载统计
    const statsRes = await checkinApi.getCheckinStats();
    stats.value = statsRes;

    // 加载主题
    const themesRes = await checkinApi.getThemes();
    themes.value = themesRes;

    // 加载最近记录
    const recordsRes = await checkinApi.getMyRecords({ page: 1, pageSize: 5 });
    records.value = recordsRes.list;
  } catch (error) {
    console.error('加载数据失败', error);
  }
};

onShow(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.checkin-page {
  min-height: 100vh;
  background: $bg-color;
  padding-bottom: 160rpx;
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

.record-list {
  .record-item {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid $border-color;

    &:last-child {
      border-bottom: none;
    }

    .record-image {
      width: 100rpx;
      height: 100rpx;
      border-radius: $radius-md;
    }

    .record-info {
      flex: 1;
      margin-left: 20rpx;

      .record-theme {
        display: block;
        font-size: $font-md;
        color: $text-color;
      }

      .record-content {
        display: block;
        font-size: $font-sm;
        color: $text-secondary;
        margin-top: 4rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .record-time {
        display: block;
        font-size: 22rpx;
        color: $text-placeholder;
        margin-top: 4rpx;
      }
    }

    .record-status {
      font-size: $font-sm;
      color: $text-placeholder;

      &.shared {
        color: $success-color;
      }
    }
  }
}

.bottom-bar {
  position: fixed;
  bottom: calc(100rpx + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  padding: $spacing-md $spacing-lg;
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 99;

  .checkin-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    background: linear-gradient(135deg, #52c41a, #73d13d);
    color: #fff;
    font-size: $font-lg;
    font-weight: 500;
    border-radius: $radius-full;
  }
}
</style>
