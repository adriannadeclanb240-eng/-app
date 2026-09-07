import { app } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs'
import { DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../shared/categories'
import { serializeCsv } from './csv'
import type {
  Category,
  Expense,
  ExpenseWithCategory,
  CategoryTreeNode,
  AddExpenseInput,
  ImportExpenseRow,
  RecordType
} from '../shared/types'

// 数据文件的结构
interface DbData {
  categories: Category[]
  expenses: Expense[]
  budgetCents: number
}

let dbPath = ''
let data: DbData = { categories: [], expenses: [], budgetCents: 0 }

export function initDb(): void {
  dbPath = join(app.getPath('userData'), 'ledger.json')
  load()
  // 首次启动时写入默认分类
  if (data.categories.length === 0) {
    seedDefaultCategories()
    save()
  }
}

function load(): void {
  if (!existsSync(dbPath)) return
  try {
    const parsed = JSON.parse(readFileSync(dbPath, 'utf-8')) as Partial<DbData>
    const cats = Array.isArray(parsed.categories) ? parsed.categories : []
    const exps = Array.isArray(parsed.expenses) ? parsed.expenses : []
    data = {
      // 旧数据没有 type 字段，默认视为「支出」
      categories: cats.map((c) => ({ ...c, type: c.type === 'income' ? 'income' : 'expense' })),
      expenses: exps.map((e) => ({ ...e, type: e.type === 'income' ? 'income' : 'expense' })),
      budgetCents: typeof parsed.budgetCents === 'number' ? parsed.budgetCents : 0
    }
  } catch (e) {
    // 数据文件损坏时从头开始，避免应用崩溃
    console.error('读取数据文件失败，将使用空数据：', e)
    data = { categories: [], expenses: [], budgetCents: 0 }
  }
}

function save(): void {
  // 先写临时文件再改名，避免写入中途崩溃导致数据损坏
  mkdirSync(dirname(dbPath), { recursive: true })
  const tmp = dbPath + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  renameSync(tmp, dbPath)
}

function nextId(list: { id: number }[]): number {
  return list.reduce((m, x) => Math.max(m, x.id), 0) + 1
}

function seedDefaultCategories(): void {
  const seed = (list: { name: string; children: string[] }[], type: RecordType): void => {
    list.forEach((top, i) => {
      const topId = nextId(data.categories)
      data.categories.push({ id: topId, parentId: null, name: top.name, sortOrder: i, type })
      top.children.forEach((child, j) => {
        data.categories.push({
          id: nextId(data.categories),
          parentId: topId,
          name: child,
          sortOrder: j,
          type
        })
      })
    })
  }
  seed(DEFAULT_CATEGORIES, 'expense')
  seed(DEFAULT_INCOME_CATEGORIES, 'income')
}

// 获取分类树（一级大类 + 二级小类）
export function listCategoryTree(): CategoryTreeNode[] {
  const top = data.categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return top.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    children: data.categories
      .filter((c) => c.parentId === t.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ id: c.id, name: c.name }))
  }))
}

// 新增收支记录
export function addExpense(input: AddExpenseInput): void {
  data.expenses.push({
    id: nextId(data.expenses),
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    type: input.type,
    date: input.date,
    note: input.note,
    createdAt: Date.now()
  })
  save()
}

// 查询所有收支记录（按日期倒序）
export function listExpenses(): ExpenseWithCategory[] {
  const byId = new Map(data.categories.map((c) => [c.id, c]))
  return data.expenses
    .map((e) => {
      const cat = byId.get(e.categoryId)
      const parent = cat && cat.parentId !== null ? byId.get(cat.parentId) : undefined
      return {
        ...e,
        categoryName: cat?.name ?? '未知分类',
        parentName: parent?.name ?? '未分类'
      }
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt
      return b.id - a.id
    })
}

// 删除收支记录
export function deleteExpense(id: number): void {
  data.expenses = data.expenses.filter((e) => e.id !== id)
  save()
}

// ---- 分类管理 ----

// 新增分类（parentId 为 null 表示新增一级大类；type 仅对一级大类生效，二级小类继承父类类型）
export function addCategory(parentId: number | null, name: string, type: RecordType): void {
  const actualType =
    parentId === null ? type : (data.categories.find((c) => c.id === parentId)?.type ?? 'expense')
  const siblings = data.categories.filter((c) => c.parentId === parentId)
  data.categories.push({
    id: nextId(data.categories),
    parentId,
    name,
    sortOrder: siblings.length,
    type: actualType
  })
  save()
}

// 重命名分类
export function renameCategory(id: number, name: string): void {
  const cat = data.categories.find((c) => c.id === id)
  if (cat) {
    cat.name = name
    save()
  }
}

// 删除分类（级联删除其子分类，该分类下的记录自动归到同类型的「其他」）
export function deleteCategory(id: number): void {
  const cat = data.categories.find((c) => c.id === id)
  if (!cat) return

  // 待删除的分类 id（含其所有子分类）
  const idsToDelete =
    cat.parentId === null
      ? [cat.id, ...data.categories.filter((c) => c.parentId === cat.id).map((c) => c.id)]
      : [cat.id]

  // 找到一个不会被删除的同类型「其他」分类作为兜底
  const fallbackId = findOrCreateFallback(idsToDelete, cat.type)

  // 受影响记录的 categoryId 改到兜底分类
  if (data.expenses.some((e) => idsToDelete.includes(e.categoryId))) {
    data.expenses = data.expenses.map((e) =>
      idsToDelete.includes(e.categoryId) ? { ...e, categoryId: fallbackId } : e
    )
  }

  // 删除分类
  data.categories = data.categories.filter((c) => !idsToDelete.includes(c.id))
  save()
}

// 找到或新建一个同类型的「其他」二级分类作为兜底（保证不在待删除集合里）
function findOrCreateFallback(excludingIds: number[], type: RecordType): number {
  const fallbackName = type === 'income' ? '其他收入' : '其他'
  const otherTop = data.categories.find(
    (c) =>
      c.parentId === null && c.name === fallbackName && c.type === type && !excludingIds.includes(c.id)
  )
  if (otherTop) {
    const sub = data.categories.find(
      (c) => c.parentId === otherTop.id && !excludingIds.includes(c.id)
    )
    if (sub) return sub.id
    const subId = nextId(data.categories)
    data.categories.push({ id: subId, parentId: otherTop.id, name: '其他', sortOrder: 0, type })
    return subId
  }
  const topId = nextId(data.categories)
  data.categories.push({
    id: topId,
    parentId: null,
    name: fallbackName,
    sortOrder: data.categories.filter((c) => c.parentId === null).length,
    type
  })
  const subId = nextId(data.categories)
  data.categories.push({ id: subId, parentId: topId, name: '其他', sortOrder: 0, type })
  return subId
}

// ---- 数据导入导出 ----

// 导出全部收支为 CSV 字符串（含表头，按日期升序）
export function exportCsv(): string {
  const byId = new Map(data.categories.map((c) => [c.id, c]))
  const rows = data.expenses
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map((e) => {
      const cat = byId.get(e.categoryId)
      const parent = cat && cat.parentId !== null ? byId.get(cat.parentId) : undefined
      return [
        e.date,
        (e.amountCents / 100).toFixed(2),
        e.type === 'income' ? '收入' : '支出',
        parent?.name ?? '',
        cat?.name ?? '',
        e.note ?? ''
      ]
    })
  return serializeCsv([['日期', '金额(元)', '类型', '一级分类', '二级分类', '备注'], ...rows])
}

// 根据名称找到（或新建）同类型的二级分类，返回其 id
export function findOrCreateCategoryByName(
  type: RecordType,
  parentName: string,
  subName: string
): number {
  let parent = data.categories.find(
    (c) => c.parentId === null && c.name === parentName && c.type === type
  )
  if (!parent) {
    const id = nextId(data.categories)
    data.categories.push({
      id,
      parentId: null,
      name: parentName,
      sortOrder: data.categories.filter((c) => c.parentId === null).length,
      type
    })
    parent = data.categories.find((c) => c.id === id)!
  }
  let sub = data.categories.find((c) => c.parentId === parent!.id && c.name === subName)
  if (!sub) {
    const id = nextId(data.categories)
    data.categories.push({
      id,
      parentId: parent!.id,
      name: subName,
      sortOrder: data.categories.filter((c) => c.parentId === parent!.id).length,
      type
    })
    sub = data.categories.find((c) => c.id === id)!
  }
  return sub.id
}

// 批量导入收支（追加）
export function importExpenses(rows: ImportExpenseRow[]): void {
  for (const r of rows) {
    const categoryId = findOrCreateCategoryByName(r.type, r.parentName, r.subName)
    data.expenses.push({
      id: nextId(data.expenses),
      amountCents: r.amountCents,
      categoryId,
      type: r.type,
      date: r.date,
      note: r.note,
      createdAt: Date.now()
    })
  }
  save()
}

// ---- 预算 ----

// 获取每月总预算（分）
export function getBudget(): number {
  return data.budgetCents
}

// 设置每月总预算（分，0 表示未设置）
export function setBudget(cents: number): void {
  data.budgetCents = cents
  save()
}
