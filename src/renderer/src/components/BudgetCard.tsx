import { useState } from 'react'
import { formatCents, parseYuanToCents } from '../utils'

interface Props {
  monthTotalCents: number
  budgetCents: number
  onSetBudget: (cents: number) => Promise<void>
}

function BudgetCard({ monthTotalCents, budgetCents, onSetBudget }: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const ratio = budgetCents > 0 ? monthTotalCents / budgetCents : 0
  const percent = Math.round(ratio * 100)
  const over = monthTotalCents - budgetCents // >0 表示已超支
  const status =
    budgetCents > 0 && ratio >= 1 ? 'over' : budgetCents > 0 && ratio >= 0.8 ? 'warn' : 'normal'

  const handleSave = async (): Promise<void> => {
    const cents = parseYuanToCents(input)
    if (cents === null) {
      setError('请输入正确的预算金额（大于 0）')
      return
    }
    await onSetBudget(cents)
    setEditing(false)
    setInput('')
    setError('')
  }

  const handleClear = async (): Promise<void> => {
    await onSetBudget(0)
    setEditing(false)
    setInput('')
  }

  if (editing) {
    return (
      <div className="budget-card">
        <div className="budget-title">设置每月预算（元）</div>
        <div className="budget-edit">
          <input
            className="inline-input"
            type="text"
            inputMode="decimal"
            placeholder="例如 5000"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            保存
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              setEditing(false)
              setInput('')
              setError('')
            }}
          >
            取消
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    )
  }

  return (
    <div className={`budget-card budget-${status}`}>
      <div className="budget-header">
        <div className="budget-title">{budgetCents > 0 ? '本月预算' : '本月预算（未设置）'}</div>
        <span className="category-actions">
          <button
            className="btn btn-link"
            onClick={() => {
              setEditing(true)
              setInput('')
            }}
          >
            {budgetCents > 0 ? '修改' : '设置'}
          </button>
          {budgetCents > 0 && (
            <button className="btn btn-link" onClick={handleClear}>
              清除
            </button>
          )}
        </span>
      </div>

      {budgetCents > 0 ? (
        <>
          <div className="budget-progress">
            <div className="budget-bar" style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
          <div className="budget-info">
            <span>
              已花 ¥{formatCents(monthTotalCents)} / 预算 ¥{formatCents(budgetCents)}（{percent}%）
            </span>
            <span className="budget-status-text">
              {over > 0 ? `已超支 ¥${formatCents(over)}` : `剩余 ¥${formatCents(-over)}`}
            </span>
          </div>
        </>
      ) : (
        <div className="budget-empty">
          本月已花 ¥{formatCents(monthTotalCents)}，点「设置」设定每月预算
        </div>
      )}
    </div>
  )
}

export default BudgetCard
