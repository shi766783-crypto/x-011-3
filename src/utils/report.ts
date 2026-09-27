// 周期报告（周报/月报）的纯函数计算：按自然周（周一至周日）和自然月（1 日至月末）取数
import type {
  Domain,
  KnowledgeCard,
  ReportPeriod,
  ReportType,
  StudyLog,
  StudyPlan,
  StudyReport,
  DomainDuration,
} from '@/types'
import { addDays, parseDateKey, toDateKey, today } from '@/utils/date'

/** 日期是否落在周期内（闭区间，YYYY-MM-DD 可直接按字符串比较） */
function inPeriod(date: string, period: ReportPeriod): boolean {
  return date >= period.start && date <= period.end
}

/**
 * 自然周周期：周一至周日。
 * offset = 0 表示本周，-1 表示上一周，以此类推。
 * 跨月的周仍是一个完整周期，每天只属于 [start, end] 一次，不会重复计入。
 */
export function weekPeriod(offset = 0): ReportPeriod {
  const todayKey = today()
  // getDay(): 0=周日 … 6=周六，换算为距离本周一的天数
  const sinceMonday = (parseDateKey(todayKey).getDay() + 6) % 7
  const start = addDays(todayKey, -sinceMonday + offset * 7)
  const end = addDays(start, 6)
  return { start, end, label: `${start} ~ ${end}` }
}

/**
 * 自然月周期：1 日至月末。
 * offset = 0 表示本月，-1 表示上月，以此类推。
 */
export function monthPeriod(offset = 0): ReportPeriod {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  const start = toDateKey(first)
  const end = toDateKey(last)
  return { start, end, label: start.slice(0, 7) }
}

/** 根据报告类型计算周期 */
export function reportPeriod(type: ReportType, offset = 0): ReportPeriod {
  return type === 'week' ? weekPeriod(offset) : monthPeriod(offset)
}

/**
 * 计划的完成日期（YYYY-MM-DD），未完成返回 undefined。
 * - 手动完成：以 completedAt 为准
 * - 学时达标：关联日志累计时长首次达到总学时的日期
 * 完成日期唯一，因此同一计划只会计入一个周期，不会跨期重复统计。
 */
export function planCompletionDate(plan: StudyPlan, logs: StudyLog[]): string | undefined {
  if (plan.completedAt) return toDateKey(new Date(plan.completedAt))
  const sorted = logs
    .filter((l) => l.planId === plan.id)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  let acc = 0
  for (const log of sorted) {
    acc += log.duration
    if (acc >= plan.totalHours) return log.date
  }
  return undefined
}

/** 期内最长连续打卡天数（以有日志的自然日为一天打卡） */
function longestStreakInPeriod(logs: StudyLog[], period: ReportPeriod): number {
  const days = new Set(logs.filter((l) => inPeriod(l.date, period)).map((l) => l.date))
  let best = 0
  let run = 0
  let cursor = period.start
  while (cursor <= period.end) {
    run = days.has(cursor) ? run + 1 : 0
    best = Math.max(best, run)
    cursor = addDays(cursor, 1)
  }
  return best
}

/**
 * 各领域期内时长：仅统计用户涉猎的领域（计划 + 卡片出现过的领域）。
 * 日志通过关联计划归属领域；未关联计划的日志计入总时长，但不归属任何领域。
 */
function domainDurations(
  plans: StudyPlan[],
  logs: StudyLog[],
  cards: KnowledgeCard[],
  period: ReportPeriod,
): DomainDuration[] {
  const domains = new Set<Domain>()
  plans.forEach((p) => domains.add(p.domain))
  cards.forEach((c) => domains.add(c.domain))

  const planDomain = new Map(plans.map((p) => [p.id, p.domain]))
  const durationByDomain = new Map<Domain, number>()
  for (const log of logs) {
    if (!inPeriod(log.date, period) || !log.planId) continue
    const domain = planDomain.get(log.planId)
    if (domain) durationByDomain.set(domain, (durationByDomain.get(domain) ?? 0) + log.duration)
  }

  return [...domains]
    .map((domain) => ({
      domain,
      duration: Math.round((durationByDomain.get(domain) ?? 0) * 10) / 10,
    }))
    .sort((a, b) => a.duration - b.duration)
}

/** 生成总结文字（调用方需保证报告非空） */
function buildSummary(report: Omit<StudyReport, 'summary'>): string {
  const noun = report.type === 'week' ? '本周' : '本月'
  const parts: string[] = [
    `${noun}共学习 ${report.totalDuration} 小时，${report.activeDays} 天有学习记录`,
    `完成 ${report.completedPlans.length} 个计划`,
    `新增 ${report.newCards.length} 张知识卡片`,
    `最长连续打卡 ${report.longestStreak} 天`,
  ]
  let summary = parts.join('，') + '。'
  if (report.weakestDomain) {
    const { domain, duration } = report.weakestDomain
    summary += `最薄弱的领域是「${domain}」，本期仅投入 ${duration} 小时，建议下期适当增加该领域的学习时间。`
  }
  return summary
}

/** 汇总生成指定类型、指定偏移的周期报告 */
export function buildReport(
  type: ReportType,
  offset: number,
  plans: StudyPlan[],
  logs: StudyLog[],
  cards: KnowledgeCard[],
): StudyReport {
  const period = reportPeriod(type, offset)
  const periodLogs = logs.filter((l) => inPeriod(l.date, period))

  const totalDuration = Math.round(periodLogs.reduce((sum, l) => sum + l.duration, 0) * 10) / 10
  const activeDays = new Set(periodLogs.map((l) => l.date)).size
  const completedPlans = plans.filter((p) => {
    const date = planCompletionDate(p, logs)
    return date !== undefined && inPeriod(date, period)
  })
  const newCards = cards.filter((c) => inPeriod(toDateKey(new Date(c.createdAt)), period))
  const durations = domainDurations(plans, logs, cards, period)

  const isEmpty = periodLogs.length === 0 && completedPlans.length === 0 && newCards.length === 0

  const base = {
    type,
    period,
    totalDuration,
    logCount: periodLogs.length,
    activeDays,
    longestStreak: longestStreakInPeriod(logs, period),
    completedPlans,
    newCards,
    domainDurations: durations,
    weakestDomain: durations.length > 0 ? durations[0] : null,
    isEmpty,
  }
  return { ...base, summary: isEmpty ? '' : buildSummary(base) }
}
