import type { ExpenseWithCategory } from '../../../shared/types'
import { formatCents, categoryEmoji, formatDateDisplay } from '../utils'

interface Props {
  expenses: ExpenseWithCategory[]
  onDelete: (id: number) => Promise<void>
}

function ExpenseList({ expenses, onDelete }: Props): React.JSX.Element {
  if (expenses.length === 0) {
    return <div className="empty">还没有记账，快来记下第一笔吧 📝</div>
  }

  const handleDelete = (e: ExpenseWithCategory): void => {
    const sign = e.type === 'income' ? '+' : '-'
    const msg = `确定删除这笔「${e.parentName} · ${e.categoryName} ${sign}¥${formatCents(e.amountCents)}」吗？`
    if (window.confirm(msg)) {
      onDelete(e.id)
    }
  }

  return (
    <table className="expense-table">
      <thead>
        <tr>
          <th>日期</th>
          <th>分类</th>
          <th>备注</th>
          <th className="amount">金额</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((e) => (
          <tr key={e.id}>
            <td className="date-cell">{formatDateDisplay(e.date)}</td>
            <td>
              <span className="cat-emoji">{categoryEmoji(e.parentName)}</span>
              {e.parentName} · {e.categoryName}
            </td>
            <td className="note">{e.note ?? '—'}</td>
            <td className={`amount ${e.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
              {e.type === 'income' ? '+' : '-'}¥{formatCents(e.amountCents)}
            </td>
            <td>
              <button className="btn btn-danger" onClick={() => handleDelete(e)}>
                删除
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ExpenseList
