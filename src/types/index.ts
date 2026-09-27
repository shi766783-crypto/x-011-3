// 领域模型类型定义 —— 单一数据来源，供 service / store / 组件共享

/** 学习领域 */
export type Domain =
  | '语言'
  | '编程'
  | '考证'
  | '兴趣'
  | '学科'
  | '职场技能'
  | '其他'

/** 学习资源 */
export interface StudyResource {
  id: string
  name: string
  link: string
}

/** 学习计划 */
export interface StudyPlan {
  id: string
  name: string
  domain: Domain
  goal: string
  /** YYYY-MM-DD */
  startDate: string
  endDate: string
  /** 预计总学时（小时） */
  totalHours: number
  /** 每日学习时长（小时） */
  dailyHours: number
  resources: StudyResource[]
  createdAt: string
  /** 手动标记完成的时间；为空表示未手动完成 */
  completedAt?: string
}

/** 掌握程度（1-5 星） */
export type MasteryLevel = 1 | 2 | 3 | 4 | 5

/** 学习日志 */
export interface StudyLog {
  id: string
  /** 关联计划（可选） */
  planId?: string
  /** YYYY-MM-DD */
  date: string
  content: string
  /** 本次学习时长（小时） */
  duration: number
  /** 1-5 星自评 */
  mastery: MasteryLevel
  problem: string
  solution: string
  notes: string
  createdAt: string
}

/** 卡片掌握程度 */
export type CardMastery = '生疏' | '熟悉' | '精通'

/** 知识卡片 */
export interface KnowledgeCard {
  id: string
  title: string
  domain: Domain
  question: string
  answer: string
  tags: string[]
  mastery: CardMastery
  reviewCount: number
  lastReviewedAt?: string
  createdAt: string
}

/** 成就判定所依赖的统计指标 */
export type MetricKey =
  | 'logCount'
  | 'maxStreak'
  | 'cardCount'
  | 'completedPlans'
  | 'totalDuration'
  | 'domainCount'

/** 成就定义（静态元数据） */
export interface AchievementDef {
  code: string
  name: string
  description: string
  icon: string
  points: number
  metric: MetricKey
  threshold: number
}

/** 已解锁成就（持久化解锁时间） */
export type UnlockedMap = Record<string, string>

/** 计划进度计算结果 */
export interface PlanProgress {
  elapsedDays: number
  remainingDays: number
  totalDays: number
  shouldHours: number
  actualHours: number
  percent: number
  status: '未开始' | '进行中' | '已完成' | '已逾期'
}

/** 聚合统计 */
export interface StudyStats {
  totalDuration: number
  currentStreak: number
  maxStreak: number
  averageDailyDuration: number
  monthlyDuration: number
  activePlans: number
  completedPlans: number
  cardCount: number
  masteredCardCount: number
  cardMasteryRate: number
  logCount: number
  domainCount: number
  trend: TrendPoint[]
}

export interface TrendPoint {
  date: string
  label: string
  duration: number
}

/** 报告类型：自然周 / 自然月 */
export type ReportType = 'week' | 'month'

/** 报告周期（闭区间，YYYY-MM-DD） */
export interface ReportPeriod {
  start: string
  end: string
  label: string
}

/** 单个领域在期内的学习投入 */
export interface DomainDuration {
  domain: Domain
  /** 期内学习时长（小时） */
  duration: number
}

/** 周期学习报告（周报 / 月报） */
export interface StudyReport {
  type: ReportType
  period: ReportPeriod
  /** 期内学习总时长（小时） */
  totalDuration: number
  /** 期内日志条数 */
  logCount: number
  /** 期内有学习记录的天数 */
  activeDays: number
  /** 期内最长连续打卡天数 */
  longestStreak: number
  /** 期内完成的计划 */
  completedPlans: StudyPlan[]
  /** 期内新增的卡片 */
  newCards: KnowledgeCard[]
  /** 各领域期内时长（升序，仅含用户涉猎的领域） */
  domainDurations: DomainDuration[]
  /** 最薄弱领域（涉猎领域中期内投入最少者）；无涉猎领域时为 null */
  weakestDomain: DomainDuration | null
  /** 期内是否无任何学习数据 */
  isEmpty: boolean
  /** 自动生成的总结文字 */
  summary: string
}

/** 实体创建输入（去除由系统生成的字段） */
export type PlanInput = Omit<StudyPlan, 'id' | 'createdAt' | 'completedAt'>
export type LogInput = Omit<StudyLog, 'id' | 'createdAt'>
export type CardInput = Omit<KnowledgeCard, 'id' | 'createdAt' | 'reviewCount' | 'lastReviewedAt'>
