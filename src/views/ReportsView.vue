<script setup lang="ts">
import { computed, ref } from 'vue'
import StatCard from '@/components/StatCard.vue'
import type { ReportType } from '@/types'
import { buildReport } from '@/utils/report'
import { useCardsStore } from '@/stores/cards'
import { useLogsStore } from '@/stores/logs'
import { usePlansStore } from '@/stores/plans'

const plansStore = usePlansStore()
const logsStore = useLogsStore()
const cardsStore = useCardsStore()

const reportType = ref<ReportType>('week')
/** 周期偏移：0 为本期，-1 为上一期，依次类推 */
const offset = ref(0)

const report = computed(() =>
  buildReport(reportType.value, offset.value, plansStore.plans, logsStore.logs, cardsStore.cards),
)

const maxDomainDuration = computed(() =>
  Math.max(...report.value.domainDurations.map((d) => d.duration), 0),
)

function switchType(type: ReportType): void {
  reportType.value = type
  offset.value = 0
}

function shift(delta: number): void {
  offset.value = Math.min(offset.value + delta, 0)
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">学习报告</h2>
      <el-radio-group :model-value="reportType" @change="switchType">
        <el-radio-button value="week">周报</el-radio-button>
        <el-radio-button value="month">月报</el-radio-button>
      </el-radio-group>
    </div>

    <div class="period-bar">
      <el-button icon="ArrowLeft" circle @click="shift(-1)" />
      <span class="period-label">
        {{ report.period.label }}
        <el-tag v-if="offset === 0" type="success" size="small" effect="plain">本期</el-tag>
      </span>
      <el-button icon="ArrowRight" circle :disabled="offset === 0" @click="shift(1)" />
    </div>

    <el-card v-if="report.isEmpty" shadow="never" class="empty-card">
      <el-empty
        :description="`本期（${report.period.label}）暂无学习数据，去记录一条日志、完成一个计划或创建一张卡片吧`"
      />
    </el-card>

    <template v-else>
      <div class="card-grid">
        <StatCard label="学习时长(时)" :value="report.totalDuration" icon="⏱️" color="#e6a23c" />
        <StatCard label="完成计划" :value="report.completedPlans.length" icon="✅" color="#67c23a" />
        <StatCard label="新增卡片" :value="report.newCards.length" icon="📚" color="#409eff" />
        <StatCard label="最长连续打卡(天)" :value="report.longestStreak" icon="🔥" color="#f56c6c" />
      </div>

      <el-card shadow="never" class="section-card">
        <template #header><span>📋 本期总结</span></template>
        <p class="summary-text">{{ report.summary }}</p>
        <el-alert
          v-if="report.weakestDomain"
          type="warning"
          :closable="false"
          show-icon
          :title="`最薄弱领域：${report.weakestDomain.domain}（本期 ${report.weakestDomain.duration} 小时）`"
        />
      </el-card>

      <el-card v-if="report.domainDurations.length > 0" shadow="never" class="section-card">
        <template #header><span>领域投入分布</span></template>
        <div class="domain-list">
          <div
            v-for="d in report.domainDurations"
            :key="d.domain"
            class="domain-item"
            :class="{ weakest: report.weakestDomain?.domain === d.domain }"
          >
            <span class="domain-name">
              {{ d.domain }}
              <el-tag v-if="report.weakestDomain?.domain === d.domain" type="warning" size="small">
                最薄弱
              </el-tag>
            </span>
            <el-progress
              class="domain-bar"
              :percentage="maxDomainDuration > 0 ? Math.round((d.duration / maxDomainDuration) * 100) : 0"
              :stroke-width="10"
              :status="report.weakestDomain?.domain === d.domain ? 'warning' : undefined"
            />
            <span class="domain-value">{{ d.duration }} 时</span>
          </div>
        </div>
      </el-card>

      <div class="detail-grid">
        <el-card shadow="never" class="section-card">
          <template #header><span>完成的计划</span></template>
          <template v-if="report.completedPlans.length > 0">
            <div v-for="p in report.completedPlans" :key="p.id" class="detail-item">
              <span class="detail-name">{{ p.name }}</span>
              <el-tag size="small" effect="plain">{{ p.domain }}</el-tag>
            </div>
          </template>
          <div v-else class="detail-empty">本期没有完成计划</div>
        </el-card>

        <el-card shadow="never" class="section-card">
          <template #header><span>新增的卡片</span></template>
          <template v-if="report.newCards.length > 0">
            <div v-for="c in report.newCards" :key="c.id" class="detail-item">
              <span class="detail-name">{{ c.title }}</span>
              <el-tag size="small" effect="plain">{{ c.domain }}</el-tag>
            </div>
          </template>
          <div v-else class="detail-empty">本期没有新增卡片</div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.period-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.period-label {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-card {
  padding: 40px 0;
}

.section-card {
  margin-top: 20px;
}

.summary-text {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.domain-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.domain-item.weakest .domain-name {
  color: #e6a23c;
  font-weight: 600;
}

.domain-name {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
}

.domain-bar {
  flex: 1;
}

.domain-value {
  width: 64px;
  text-align: right;
  font-size: 13px;
  color: #909399;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-name {
  font-size: 14px;
  color: #303133;
}

.detail-empty {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 12px 0;
}
</style>
