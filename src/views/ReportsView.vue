<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ReportType } from '@/types'
import { shortLabel, today } from '@/utils/date'
import { buildReport, periodRange, shiftAnchor } from '@/utils/report'
import StatCard from '@/components/StatCard.vue'
import { useCardsStore } from '@/stores/cards'
import { useLogsStore } from '@/stores/logs'
import { usePlansStore } from '@/stores/plans'

const router = useRouter()
const plansStore = usePlansStore()
const logsStore = useLogsStore()
const cardsStore = useCardsStore()

const reportType = ref<ReportType>('week')
const anchor = ref(today())

const report = computed(() =>
  buildReport(reportType.value, anchor.value, plansStore.plans, logsStore.logs, cardsStore.cards),
)

const unit = computed(() => (reportType.value === 'week' ? '周' : '月'))
const rangeText = computed(() => `${shortLabel(report.value.startDate)} – ${shortLabel(report.value.endDate)}`)

const isCurrentPeriod = computed(() => {
  const t = today()
  return report.value.startDate <= t && t <= report.value.endDate
})

/** 下一周期整体在未来时禁止前进 */
const canGoNext = computed(
  () => periodRange(reportType.value, shiftAnchor(reportType.value, anchor.value, 1)).start <= today(),
)

function shift(delta: number): void {
  anchor.value = shiftAnchor(reportType.value, anchor.value, delta)
}

function backToCurrent(): void {
  anchor.value = today()
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">学习报告</h2>
      <el-radio-group v-model="reportType">
        <el-radio-button value="week">周报</el-radio-button>
        <el-radio-button value="month">月报</el-radio-button>
      </el-radio-group>
    </div>

    <el-card shadow="never" class="period-card">
      <div class="period-nav">
        <el-button @click="shift(-1)">‹ 上一{{ unit }}</el-button>
        <div class="period-label">
          <span class="period-name">{{ report.label }}</span>
          <span class="period-range">{{ rangeText }}</span>
          <el-tag v-if="isCurrentPeriod" type="success" size="small">本期</el-tag>
        </div>
        <el-button :disabled="!canGoNext" @click="shift(1)">下一{{ unit }} ›</el-button>
        <el-button v-if="!isCurrentPeriod" text type="primary" @click="backToCurrent">
          回到本期
        </el-button>
      </div>
    </el-card>

    <template v-if="!report.isEmpty">
      <el-card shadow="never" class="summary-card">
        <template #header><span>周期总结</span></template>
        <p class="summary-text">{{ report.summary }}</p>
      </el-card>

      <div class="card-grid stats-grid">
        <StatCard label="学习时长(时)" :value="report.totalDuration" icon="⏱️" color="#409eff" />
        <StatCard label="打卡天数" :value="report.activeDays" icon="📅" color="#67c23a" />
        <StatCard label="最长连续打卡(天)" :value="report.longestStreak" icon="🔥" color="#f56c6c" />
        <StatCard label="完成计划" :value="report.completedPlanNames.length" icon="✅" color="#e6a23c" />
        <StatCard label="新增卡片" :value="report.newCardCount" icon="📚" color="#8e44ad" />
      </div>

      <el-card v-if="report.completedPlanNames.length > 0" shadow="never" class="section-card">
        <template #header><span>本期完成的计划</span></template>
        <el-tag
          v-for="name in report.completedPlanNames"
          :key="name"
          type="success"
          class="plan-tag"
        >
          {{ name }}
        </el-tag>
      </el-card>

      <el-card v-if="report.domains.length > 0" shadow="never" class="section-card">
        <template #header><span>领域分布</span></template>
        <el-table :data="report.domains" stripe>
          <el-table-column label="领域" min-width="140">
            <template #default="{ row }">
              <span class="domain-name">{{ row.domain }}</span>
              <el-tag
                v-if="report.weakestDomain?.domain === row.domain"
                type="danger"
                size="small"
              >
                最薄弱
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="学习时长(时)" width="120">
            <template #default="{ row }">{{ row.duration }}</template>
          </el-table-column>
          <el-table-column label="日志条数" width="100">
            <template #default="{ row }">{{ row.logCount }}</template>
          </el-table-column>
          <el-table-column label="平均掌握度" width="120">
            <template #default="{ row }">
              {{ row.averageMastery === null ? '—' : `${row.averageMastery} 星` }}
            </template>
          </el-table-column>
          <el-table-column label="新增卡片" width="100">
            <template #default="{ row }">{{ row.newCards }}</template>
          </el-table-column>
          <el-table-column label="生疏卡片" width="100">
            <template #default="{ row }">{{ row.weakCards }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-card v-else shadow="never" class="empty-card">
      <el-empty>
        <template #description>
          <p class="empty-title">本{{ unit }}暂无学习数据</p>
          <p class="empty-hint">
            记录学习日志、完成计划或新建知识卡片后，这里会自动生成{{ unit }}报总结
          </p>
        </template>
        <el-button type="primary" @click="router.push('/logs')">去记录日志</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<style scoped>
.period-card {
  margin-bottom: 20px;
}

.period-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.period-label {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
}

.period-name {
  font-size: 17px;
  font-weight: 600;
  color: #1f2d3d;
}

.period-range {
  font-size: 13px;
  color: #909399;
}

.summary-card {
  margin-bottom: 20px;
}

.summary-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.9;
  color: #303133;
}

.stats-grid {
  margin-bottom: 20px;
}

.section-card {
  margin-bottom: 20px;
}

.plan-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.domain-name {
  margin-right: 8px;
}

.empty-card {
  padding: 24px 0;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 15px;
  color: #606266;
}

.empty-hint {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
</style>
