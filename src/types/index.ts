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

/** 报告周期类型 */
export type ReportType = 'week' | 'month'

/** 周期内单个领域的表现 */
export interface DomainBreakdown {
  domain: Domain
  /** 当期学习时长（小时） */
  duration: number
  /** 当期日志条数 */
  logCount: number
  /** 当期日志平均掌握度（1-5）；无日志时为 null */
  averageMastery: number | null
  /** 当期新增卡片数 */
  newCards: number
  /** 当前仍为生疏的卡片数（弱项信号） */
  weakCards: number
}

/** 周报/月报（按自然周/自然月统计，数据仅计入所属周期一次） */
export interface PeriodReport {
  type: ReportType
  /** 周期起始日期 YYYY-MM-DD（含） */
  startDate: string
  /** 周期结束日期 YYYY-MM-DD（含） */
  endDate: string
  /** 周期标签，如「2026年第39周」「2026年9月」 */
  label: string
  /** 当期学习总时长（小时） */
  totalDuration: number
  /** 当期有学习记录的天数 */
  activeDays: number
  /** 当期日志条数 */
  logCount: number
  /** 当期内最长连续打卡天数 */
  longestStreak: number
  /** 当期完成的计划名称 */
  completedPlanNames: string[]
  /** 当期新增卡片数 */
  newCardCount: number
  /** 领域分布（按当期时长降序） */
  domains: DomainBreakdown[]
  /** 最薄弱领域（当期投入最少，并列时生疏卡片更多者） */
  weakestDomain: DomainBreakdown | null
  /** 当期是否无任何学习数据 */
  isEmpty: boolean
  /** 自动生成的总结 */
  summary: string
}

/** 实体创建输入（去除由系统生成的字段） */
export type PlanInput = Omit<StudyPlan, 'id' | 'createdAt' | 'completedAt'>
export type LogInput = Omit<StudyLog, 'id' | 'createdAt'>
export type CardInput = Omit<KnowledgeCard, 'id' | 'createdAt' | 'reviewCount' | 'lastReviewedAt'>
