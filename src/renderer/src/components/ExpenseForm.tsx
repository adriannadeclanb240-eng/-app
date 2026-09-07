import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import CategoryPicker from './CategoryPicker'
import type { CategoryTreeNode, AddExpenseInput, RecordType } from '../../../shared/types'
import { parseYuanToCents, todayStr } from '../utils'

interface Props {
  categories: CategoryTreeNode[]
  onAdd: (input: AddExpenseInput) => Promise<void>
}

function ExpenseForm({ categories, onAdd }: Props): React.JSX.Element {
  const [type, setType] = useState<RecordType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const filteredCategories = categories.filter((c) => c.type === type)

  const switchType = (t: RecordType): void => {
    if (t !== type) {
      setType(t)
      setCategoryId(null)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')

    const cents = parseYuanToCents(amount)
    if (cents === null) {
      setError('请输入正确的金额（大于 0，最多两位小数）')
      return
    }
    if (categoryId === null) {
      setError('请选择分类')
      return
    }
    if (!date) {
      setError('请选择日期')
      return
    }

    setSubmitting(true)
    try {
      await onAdd({ amountCents: cents, categoryId, type, date, note: note.trim() || null })
      setAmount('')
      setNote('')
      // 保留分类和日期，方便连续记账
      amountRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row type-row">
        <div className="type-toggle">
          <button
            type="button"
            className={type === 'expense' ? 'type-btn active expense' : 'type-btn'}
            onClick={() => switchType('expense')}
          >
            支出
          </button>
          <button
            type="button"
            className={type === 'income' ? 'type-btn active income' : 'type-btn'}
            onClick={() => switchType('income')}
          >
            收入
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>金额（元）</label>
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <CategoryPicker categories={filteredCategories} value={categoryId} onChange={setCategoryId} />
        <div className="field">
          <label>日期</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field field-wide">
          <label>备注（可选）</label>
          <input
            type="text"
            placeholder="例如：午餐外卖"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}

export default ExpenseForm
