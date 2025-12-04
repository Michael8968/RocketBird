<template>
  <view class="referral-page">
    <!-- 邀请卡片 -->
    <view class="invite-card">
      <view class="card-title">邀请好友一起健身</view>
      <view class="card-desc">每邀请一位好友注册，你和好友都将获得奖励</view>

      <view class="invite-code-section" v-if="inviteCode">
        <text class="code-label">我的邀请码</text>
        <view class="code-box">
          <text class="code-text">{{ inviteCode.code }}</text>
          <text class="copy-btn" @click="copyCode">复制</text>
        </view>
      </view>

      <view class="reward-info">
        <view class="reward-item">
          <text class="reward-icon">🎁</text>
          <view class="reward-content">
            <text class="reward-title">你可获得</text>
            <text class="reward-value">{{ inviteCode?.inviterReward || 100 }}积分</text>
          </view>
        </view>
        <view class="reward-divider"></view>
        <view class="reward-item">
          <text class="reward-icon">🎉</text>
          <view class="reward-content">
            <text class="reward-title">好友可获得</text>
            <text class="reward-value">{{ inviteCode?.inviteeReward || 50 }}积分</text>
          </view>
        </view>
      </view>

      <button class="share-btn" @click="generatePoster">
        <text>生成分享海报</text>
      </button>
    </view>

    <!-- 邀请统计 -->
    <view class="stats-section">
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalInvites }}</text>
        <text class="stat-label">邀请人数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.successInvites }}</text>
        <text class="stat-label">注册成功</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalRewards }}</text>
        <text class="stat-label">获得积分</text>
      </view>
    </view>

    <!-- 邀请记录 -->
    <view class="records-section">
      <text class="section-title">邀请记录</text>
      <view class="record-list" v-if="records.length">
        <ListItem
          v-for="record in records"
          :key="record.recordId"
          :icon-image="record.inviteeAvatar || '/static/default-avatar.png'"
          icon-size="80rpx"
          :title="record.inviteeName || '新用户'"
          :desc="formatDate(record.createdAt)"
        >
          <template #action>
            <text class="reward-text" v-if="record.status === 1">+{{ record.reward }}积分</text>
            <text class="pending-text" v-else>待完成</text>
          </template>
        </ListItem>
      </view>

      <!-- 加载更多 -->
      <LoadMore
        v-if="records.length > 0"
        :loading="loading"
        :has-more="hasMore"
        @load="loadMore"
      />

      <!-- 空状态 -->
      <EmptyState
        v-if="!loading && records.length === 0"
        text="暂无邀请记录，快去邀请好友吧~"
        :show-image="false"
      />
    </view>

    <!-- 分享海报弹窗 -->
    <view class="poster-modal" v-if="showPoster" @click="showPoster = false">
      <view class="poster-content" @click.stop>
        <image class="poster-image" :src="posterUrl" mode="widthFix" />
        <view class="poster-actions">
          <button class="save-btn" @click="savePoster">保存图片</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow, onReachBottom } from '@dcloudio/uni-app';
import { referralApi } from '@/api';
import { formatDate } from '@rocketbird/shared';
import { ListItem, EmptyState, LoadMore } from '@/components';
import type { InviteRecord, MyInviteCode, InviteStats } from '@rocketbird/shared';

const loading = ref(false);
const inviteCode = ref<MyInviteCode | null>(null);
const stats = ref<InviteStats>({
  totalInvites: 0,
  successInvites: 0,
  totalRewards: 0,
});
const records = ref<InviteRecord[]>([]);
const page = ref(1);
const pageSize = 10;
const hasMore = ref(true);

const showPoster = ref(false);
const posterUrl = ref('');

// 加载邀请码
const loadInviteCode = async () => {
  try {
    const res = await referralApi.getMyInviteCode();
    inviteCode.value = res;
  } catch (error) {
    console.error('加载邀请码失败', error);
  }
};

// 加载统计
const loadStats = async () => {
  try {
    const res = await referralApi.getInviteStats();
    stats.value = res;
  } catch (error) {
    console.error('加载统计失败', error);
  }
};

// 加载邀请记录
const loadRecords = async (refresh = false) => {
  if (loading.value) return;

  try {
    loading.value = true;
    if (refresh) {
      page.value = 1;
      hasMore.value = true;
    }

    const res = await referralApi.getInviteRecords({
      page: page.value,
      pageSize,
    });

    if (refresh) {
      records.value = res.list;
    } else {
      records.value = [...records.value, ...res.list];
    }

    hasMore.value = res.list.length === pageSize;
  } catch (error) {
    console.error('加载记录失败', error);
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    page.value++;
    loadRecords();
  }
};

// 复制邀请码
const copyCode = () => {
  if (!inviteCode.value) return;
  uni.setClipboardData({
    data: inviteCode.value.code,
    success: () => {
      uni.showToast({ title: '复制成功', icon: 'success' });
    },
  });
};

// 生成海报
const generatePoster = async () => {
  try {
    uni.showLoading({ title: '生成中...' });
    const res = await referralApi.generateSharePoster();
    posterUrl.value = res.posterUrl;
    showPoster.value = true;
  } catch (error) {
    console.error('生成海报失败', error);
    uni.showToast({ title: '生成失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// 保存海报
const savePoster = () => {
  uni.downloadFile({
    url: posterUrl.value,
    success: (downloadRes) => {
      uni.saveImageToPhotosAlbum({
        filePath: downloadRes.tempFilePath,
        success: () => {
          uni.showToast({ title: '保存成功', icon: 'success' });
          showPoster.value = false;
        },
        fail: () => {
          uni.showToast({ title: '保存失败', icon: 'none' });
        },
      });
    },
  });
};

onShow(() => {
  loadInviteCode();
  loadStats();
  loadRecords(true);
});

onReachBottom(() => {
  loadMore();
});
</script>

<style lang="scss" scoped>
.referral-page {
  min-height: 100vh;
  background: $bg-color;
  padding-bottom: env(safe-area-inset-bottom);
}

.invite-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  margin: $spacing-md;
  padding: 40rpx;
  border-radius: $radius-lg;
  color: #fff;

  .card-title {
    font-size: 40rpx;
    font-weight: 600;
  }

  .card-desc {
    font-size: 26rpx;
    opacity: 0.9;
    margin-top: 12rpx;
  }

  .invite-code-section {
    margin-top: $spacing-lg;

    .code-label {
      font-size: 26rpx;
      opacity: 0.9;
    }

    .code-box {
      display: flex;
      align-items: center;
      margin-top: 12rpx;
      background: rgba(255, 255, 255, 0.2);
      border-radius: $radius-md;
      padding: 20rpx;

      .code-text {
        flex: 1;
        font-size: 40rpx;
        font-weight: 600;
        letter-spacing: 4rpx;
      }

      .copy-btn {
        font-size: 26rpx;
        padding: $spacing-xs $spacing-md;
        background: #fff;
        color: #667eea;
        border-radius: $radius-sm;
      }
    }
  }

  .reward-info {
    display: flex;
    margin-top: $spacing-lg;
    padding: $spacing-md;
    background: rgba(255, 255, 255, 0.15);
    border-radius: $radius-md;

    .reward-item {
      flex: 1;
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .reward-icon {
        font-size: 40rpx;
      }

      .reward-content {
        .reward-title {
          display: block;
          font-size: $font-sm;
          opacity: 0.9;
        }

        .reward-value {
          display: block;
          font-size: $font-lg;
          font-weight: 600;
          margin-top: 4rpx;
        }
      }
    }

    .reward-divider {
      width: 1rpx;
      background: rgba(255, 255, 255, 0.3);
      margin: 0 $spacing-md;
    }
  }

  .share-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    margin-top: $spacing-lg;
    background: #fff;
    color: #667eea;
    font-size: $font-lg;
    font-weight: 500;
    border-radius: $radius-full;
  }
}

.stats-section {
  display: flex;
  background: #fff;
  margin: $spacing-md;
  padding: $spacing-lg;
  border-radius: $radius-lg;

  .stat-item {
    flex: 1;
    text-align: center;

    .stat-value {
      display: block;
      font-size: $font-xxl;
      font-weight: 600;
      color: $primary-color;
    }

    .stat-label {
      display: block;
      font-size: 26rpx;
      color: $text-secondary;
      margin-top: $spacing-xs;
    }
  }
}

.records-section {
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

  .reward-text {
    font-size: $font-md;
    color: $primary-color;
    font-weight: 500;
  }

  .pending-text {
    font-size: 26rpx;
    color: $text-placeholder;
  }
}

// 海报弹窗
.poster-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;

  .poster-content {
    width: 80%;
    background: #fff;
    border-radius: $radius-lg;
    overflow: hidden;

    .poster-image {
      width: 100%;
    }

    .poster-actions {
      padding: $spacing-md;

      .save-btn {
        width: 100%;
        height: 80rpx;
        line-height: 80rpx;
        background: $primary-color;
        color: #fff;
        font-size: 30rpx;
        border-radius: $radius-full;
      }
    }
  }
}
</style>
