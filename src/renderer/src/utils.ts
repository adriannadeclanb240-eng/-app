// 金额（分）→ 显示字符串，如 2550 → "25.50"
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

// 用户输入的金额（元）→ 分；非法输入返回 null
export function parseYuanToCents(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const cents = Math.round(parseFloat(trimmed) * 100)
  if (cents <= 0) return null
  return cents
}

// 今天的日期，格式 YYYY-MM-DD
export function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 一级大类的图标（按名称匹配，自定义分类用通用图标）
const CATEGORY_EMOJI: Record<string, string> = {
  餐饮: '🍜',
  交通: '🚌',
  购物: '🛍️',
  居住: '🏠',
  娱乐: '🎬',
  医疗健康: '💊',
  教育: '📚',
  人情往来: '🎁',
  通讯: '📱',
  其他: '📦',
  工资: '💰',
  理财: '📈',
  红包: '🧧',
  兼职: '💼',
  其他收入: '💵'
}

export function categoryEmoji(name: string): string {
  return CATEGORY_EMOJI[name] ?? '📁'
}

// 日期格式化为 YYYY-MM-DD
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日期显示：今天 / 昨天 / YYYY-MM-DD
export function formatDateDisplay(date: string): string {
  const now = new Date()
  if (date === dateStr(now)) return '今天'
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (date === dateStr(yest)) return '昨天'
  return date
}
