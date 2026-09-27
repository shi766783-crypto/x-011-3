// 周报/月报生成：按自然周（周一至周日）/自然月聚合学习数据
// 所有指标严格按 [start, end] 闭区间过滤，跨月的数据只计入各自所属周期，不重复统计

import type {
  Domain,
  DomainBreakdown,
  KnowledgeCard,
  PeriodReport,
  ReportType,
  StudyLog,
  StudyPlan,
} from '@/types'
import {
  addDays,
  isoWeekNumber,
  isoWeekYear,
  monthEndOf,
  monthOf,
  monthStartOf,
  parseDateKey,
  shortLabel,
  toDateKey,
  weekEndOf,
  weekStartOf,
} from '@/utils/date'

export interface PeriodRange {
  start: string
  end: string
  label: string
}

/** 锚点日期所属自然周期的范围与标签 */
export function periodRange(type: ReportType, anchor: string): PeriodRange {
  if (type === 'week') {
    const start = weekStartOf(anchor)
    return {
      start,
      end: weekEndOf(anchor),
      label: `${isoWeekYear(start)}年第${isoWeekNumber(start)}周`,
    }
  }
  const [y, m] = monthOf(anchor).split('-')
  return {
    start: monthStartOf(anchor),
    end: monthEndOf(anchor),
    label: `${y}年${Number(m)}月`,
  }
}

/** 将锚点平移 delta 个周期（结果落在目标周期内即可，具体日不重要） */
export function shiftAnchor(type: ReportType, anchor: string, delta: number): string {
  if (type === 'week') return addDays(anchor, delta * 7)
  const date = parseDateKey(anchor)
  // 先归一到 1 号再加减月份，避免 31 号跨月溢出
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + delta, 1))
}

/** 计划完成日期：手动完成取 completedAt；否则取累计学时首次达标当天 */
function planCompletionDate(plan: StudyPlan, logs: StudyLog[]): string | null {
  if (plan.completedAt) return plan.completedAt.slice(0, 10)
  const planLogs = logs
    .filter((l) => l.planId === plan.id)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  let accumulated = 0
  for (const log of planLogs) {
    accumulated += log.duration
    if (accumulated >= plan.totalHours) return log.date
  }
  return null
}

/** 区间内的最长连续打卡天数 */
function longestStreakInRange(dates: Set<string>, start: string, end: string): number {
  let best = 0
  let run = 0
  for (let d = start; d <= end; d = addDays(d, 1)) {
    run = dates.has(d) ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

interface DomainAccumulator {
  domain: Domain
  duration: number
  logCount: number
  masterySum: number
  newCards: number
  weakCards: number
}

/** 汇总当期各领域表现（含活跃计划涉及但本期未学习的领域，便于找出薄弱环节） */
function breakdownByDomain(
  plans: StudyPlan[],
  periodLogs: StudyLog[],
  periodCards: KnowledgeCard[],
  allCards: KnowledgeCard[],
  start: string,
  end: string,
): DomainBreakdown[] {
  const planDomain = new Map(plans.map((p) => [p.id, p.domain]))
  const map = new Map<Domain, DomainAccumulator>()
  const ensure = (domain: Domain): DomainAccumulator => {
    let item = map.get(domain)
    if (!item) {
      item = { domain, duration: 0, logCount: 0, masterySum: 0, newCards: 0, weakCards: 0 }
      map.set(domain, item)
    }
    return item
  }

  // 周期内有计划的领域（计划日期与周期相交即视为当期应投入）
  for (const plan of plans) {
    if (plan.startDate <= end && plan.endDate >= start) ensure(plan.domain)
  }
  for (const log of periodLogs) {
    const domain = log.planId ? planDomain.get(log.planId) : undefined
    if (!domain) continue
    const item = ensure(domain)
    item.duration += log.duration
    item.logCount += 1
    item.masterySum += log.mastery
  }
  for (const card of periodCards) {
    ensure(card.domain).newCards += 1
  }
  for (const card of allCards) {
    if (card.mastery !== '生疏') continue
    const item = map.get(card.domain)
    if (item) item.weakCards += 1
  }

  return [...map.values()]
    .map((item) => ({
      domain: item.domain,
      duration: Math.round(item.duration * 10) / 10,
      logCount: item.logCount,
      averageMastery:
        item.logCount > 0 ? Math.round((item.masterySum / item.logCount) * 10) / 10 : null,
      newCards: item.newCards,
      weakCards: item.weakCards,
    }))
    .sort((a, b) => b.duration - a.duration || a.domain.localeCompare(b.domain, 'zh'))
}

/** 最薄弱领域：当期投入最少；并列时生疏卡片更多、名称靠前者优先 */
function pickWeakestDomain(domains: DomainBreakdown[]): DomainBreakdown | null {
  if (domains.length === 0) return null
  return [...domains].sort(
    (a, b) =>
      a.duration - b.duration ||
      b.weakCards - a.weakCards ||
      a.domain.localeCompare(b.domain, 'zh'),
  )[0]
}

/** 把当期指标串成一段自然语言总结 */
function buildSummary(report: Omit<PeriodReport, 'summary'>): string {
  const range = `${shortLabel(report.startDate)}–${shortLabel(report.endDate)}`
  const sentences: string[] = []

  sentences.push(
    `${report.label}（${range}）共学习 ${report.totalDuration} 小时，` +
      `打卡 ${report.activeDays} 天，最长连续打卡 ${report.longestStreak} 天`,
  )

  const planText =
    report.completedPlanNames.length > 0
      ? `完成 ${report.completedPlanNames.length} 个计划（${report.completedPlanNames.join('、')}）`
      : '没有完成计划'
  const cardText =
    report.newCardCount > 0 ? `新增 ${report.newCardCount} 张知识卡片` : '没有新增知识卡片'
  sentences.push(`${planText}，${cardText}`)

  const weakest = report.weakestDomain
  if (weakest) {
    const durationText =
      weakest.duration > 0 ? `本期仅投入 ${weakest.duration} 小时` : '本期尚未投入时间'
    const masteryText =
      weakest.averageMastery !== null ? `，平均掌握度 ${weakest.averageMastery} 星` : ''
    const weakCardText = weakest.weakCards > 0 ? `，另有 ${weakest.weakCards} 张卡片仍生疏` : ''
    sentences.push(
      `最薄弱的领域是「${weakest.domain}」，${durationText}${masteryText}${weakCardText}，建议下期优先安排`,
    )
  }

  return `${sentences.join('；')}。`
}

/** 生成锚点日期所在自然周期的报告 */
export function buildReport(
  type: ReportType,
  anchor: string,
  plans: StudyPlan[],
  logs: StudyLog[],
  cards: KnowledgeCard[],
): PeriodReport {
  const { start, end, label } = periodRange(type, anchor)
  const inRange = (date: string): boolean => date >= start && date <= end

  const periodLogs = logs.filter((l) => inRange(l.date))
  const periodCards = cards.filter((c) => inRange(c.createdAt.slice(0, 10)))
  const completedPlanNames = plans
    .filter((p) => {
      const date = planCompletionDate(p, logs)
      return date !== null && inRange(date)
    })
    .map((p) => p.name)

  const domains = breakdownByDomain(plans, periodLogs, periodCards, cards, start, end)

  const base = {
    type,
    startDate: start,
    endDate: end,
    label,
    totalDuration: Math.round(periodLogs.reduce((sum, l) => sum + l.duration, 0) * 10) / 10,
    activeDays: new Set(periodLogs.map((l) => l.date)).size,
    logCount: periodLogs.length,
    longestStreak: longestStreakInRange(new Set(logs.map((l) => l.date)), start, end),
    completedPlanNames,
    newCardCount: periodCards.length,
    domains,
    weakestDomain: pickWeakestDomain(domains),
    isEmpty: periodLogs.length === 0 && periodCards.length === 0 && completedPlanNames.length === 0,
  }

  return { ...base, summary: buildSummary(base) }
}
