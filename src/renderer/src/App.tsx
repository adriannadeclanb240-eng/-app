import { useCallback, useEffect, useMemo, useState } from 'react'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import CategoryManager from './components/CategoryManager'
import Statistics from './components/Statistics'
import BudgetCard from './components/BudgetCard'
import type {
  CategoryTreeNode,
  ExpenseWithCategory,
  AddExpenseInput,
  RecordType
} from '../../shared/types'
import { formatCents } from './utils'

function App(): React.JSX.Element {
  const [categories, setCategories] = useState<CategoryTreeNode[]>([])
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [budgetCents, setBudgetCents] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'ledger' | 'stats' | 'categories'>('ledger')

  const refresh = useCallback(async (): Promise<void> => {
    const [c, e, b] = await Promise.all([
      window.api.listCategories(),
      window.api.listExpenses(),
      window.api.getBudget()
    ])
    setCategories(c)
    setExpenses(e)
    setBudgetCents(b)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAdd = useCallback(
    async (input: AddExpenseInput): Promise<void> => {
      await window.api.addExpense(input)
      await refresh()
    },
    [refresh]
  )

  const handleDelete = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteExpense(id)
      await refresh()
    },
    [refresh]
  )

  const handleAddCategory = useCallback(
    async (parentId: number | null, name: string, type: RecordType): Promise<void> => {
      await window.api.addCategory(parentId, name, type)
      await refresh()
    },
    [refresh]
  )

  const handleRenameCategory = useCallback(
    async (id: number, name: string): Promise<void> => {
      await window.api.renameCategory(id, name)
      await refresh()
    },
    [refresh]
  )

  const handleDeleteCategory = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteCategory(id)
      await refresh()
    },
    [refresh]
  )

  const handleExport = useCallback(async (): Promise<void> => {
    const result = await window.api.exportData()
    if (result.canceled) return
    if (result.path) {
      window.alert(`导出成功！\n文件已保存到：\n${result.path}`)
    }
  }, [])

  const handleImport = useCallback(async (): Promise<void> => {
    const result = await window.api.importData()
    if (result.canceled) return
    window.alert(`导入完成！\n新增 ${result.imported} 笔，跳过 ${result.skipped} 笔（格式不正确）`)
    await refresh()
  }, [refresh])

  const handleSetBudget = useCallback(async (cents: number): Promise<void> => {
    await window.api.setBudget(cents)
    setBudgetCents(cents)
  }, [])

  const monthTotal = useMemo(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return expenses
      .filter((e) => e.date.startsWith(ym) && e.type === 'expense')
      .reduce((sum, e) => sum + e.amountCents, 0)
  }, [expenses])

  return (
    <div className="app">
      <header className="header">
        <h1>💰 个人账本</h1>
        <div className="header-right">
          <button className="btn btn-ghost" onClick={handleExport}>
            导出 CSV
          </button>
          <button className="btn btn-ghost" onClick={handleImport}>
            导入 CSV
          </button>
          <div className="month-total">
            本月支出
            <strong>¥{formatCents(monthTotal)}</strong>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button className={view === 'ledger' ? 'tab active' : 'tab'} onClick={() => setView('ledger')}>
          记一笔
        </button>
        <button className={view === 'stats' ? 'tab active' : 'tab'} onClick={() => setView('stats')}>
          统计
        </button>
        <button
          className={view === 'categories' ? 'tab active' : 'tab'}
          onClick={() => setView('categories')}
        >
          分类管理
        </button>
      </nav>

      {view === 'ledger' && (
        <>
          <BudgetCard
            monthTotalCents={monthTotal}
            budgetCents={budgetCents}
            onSetBudget={handleSetBudget}
          />
          <section className="card">
            <h2>记一笔</h2>
            <ExpenseForm categories={categories} onAdd={handleAdd} />
          </section>
          <section className="card">
            <h2>账单明细</h2>
            {loading ? (
              <div className="empty">加载中…</div>
            ) : (
              <ExpenseList expenses={expenses} onDelete={handleDelete} />
            )}
          </section>
        </>
      )}

      {view === 'stats' && <Statistics expenses={expenses} />}

      {view === 'categories' && (
        <section className="card">
          <h2>分类管理</h2>
          <CategoryManager
            categories={categories}
            onAdd={handleAddCategory}
            onRename={handleRenameCategory}
            onDelete={handleDeleteCategory}
          />
        </section>
      )}
    </div>
  )
}

export default App
