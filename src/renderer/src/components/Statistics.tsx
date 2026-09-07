import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts'
import type { ExpenseWithCategory } from '../../../shared/types'

// 已验证的分类色板（dataviz 默认色板·浅色模式，固定顺序）
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

const MUTED = '#898781'
const SECONDARY = '#52514e'
const GRID = '#e1e0d9'
const AXIS = '#c3c2b7'

function ymOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  expenses: ExpenseWithCategory[]
}

function Statistics({ expenses }: Props): React.JSX.Element {
  // 本月分类支出（按一级大类汇总、降序；超过 7 类则合并其余为「其他」）
  const monthCategoryData = useMemo(() => {
    const ym = ymOf(new Date())
    const map = new Map<string, number>()
    for (const e of expenses) {
      if (e.date.startsWith(ym) && e.type === 'expense') {
        map.set(e.parentName, (map.get(e.parentName) ?? 0) + e.amountCents)
      }
    }
    let items = [...map.entries()].map(([name, cents]) => ({ name, cents }))
    items.sort((a, b) => b.cents - a.cents)
    if (items.length > 7) {
      const top = items.slice(0, 7)
      const restSum = items.slice(7).reduce((s, x) => s + x.cents, 0)
      const existingOther = top.find((x) => x.name === '其他')
      if (existingOther) existingOther.cents += restSum
      else top.push({ name: '其他', cents: restSum })
      items = top
    }
    const total = items.reduce((s, x) => s + x.cents, 0)
    return items.map((x) => {
      const percent = total > 0 ? Math.round((x.cents / total) * 100) : 0
      return {
        name: x.name,
        value: x.cents / 100,
        label: `¥${(x.cents / 100).toFixed(2)} · ${percent}%`
      }
    })
  }, [expenses])

  // 近 12 个月支出趋势
  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const result: { label: string; value: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = ymOf(d)
      const cents = expenses
        .filter((e) => e.date.startsWith(ym) && e.type === 'expense')
        .reduce((s, e) => s + e.amountCents, 0)
      result.push({ label: `${d.getMonth() + 1}月`, value: cents / 100 })
    }
    return result
  }, [expenses])

  const monthExpense = monthCategoryData.reduce((s, x) => s + x.value, 0)

  const monthIncome = useMemo(() => {
    const ym = ymOf(new Date())
    return (
      expenses
        .filter((e) => e.date.startsWith(ym) && e.type === 'income')
        .reduce((s, e) => s + e.amountCents, 0) / 100
    )
  }, [expenses])

  const monthBalance = monthIncome - monthExpense
  const balanceText =
    monthBalance >= 0 ? `¥${monthBalance.toFixed(2)}` : `-¥${Math.abs(monthBalance).toFixed(2)}`

  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card stat-card-green">
          <div className="stat-label">本月收入</div>
          <div className="stat-value">¥{monthIncome.toFixed(2)}</div>
        </div>
        <div className="stat-card stat-card-orange">
          <div className="stat-label">本月支出</div>
          <div className="stat-value">¥{monthExpense.toFixed(2)}</div>
        </div>
        <div className="stat-card stat-card-blue">
          <div className="stat-label">本月结余</div>
          <div className="stat-value">{balanceText}</div>
        </div>
      </div>

      <section className="card">
        <h2>本月分类支出</h2>
        {monthCategoryData.length === 0 ? (
          <div className="empty">本月还没有支出记录</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(140, monthCategoryData.length * 48)}>
            <BarChart
              data={monthCategoryData}
              layout="vertical"
              margin={{ top: 4, right: 96, left: 8, bottom: 4 }}
            >
              <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
              <XAxis type="number" tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: AXIS }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fill: SECONDARY, fontSize: 13 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `¥${Number(v).toFixed(2)}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" maxBarSize={24} radius={[0, 4, 4, 0]}>
                {monthCategoryData.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
                <LabelList dataKey="label" position="right" style={{ fill: SECONDARY, fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="card">
        <h2>近 12 个月支出趋势</h2>
        {expenses.filter((e) => e.type === 'expense').length === 0 ? (
          <div className="empty">暂无支出数据</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: AXIS }} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `¥${Number(v).toFixed(2)}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" fill="#f59e0b" maxBarSize={24} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  )
}

export default Statistics
