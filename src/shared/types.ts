// 收支类型
export type RecordType = 'income' | 'expense'

// 一级大类 或 二级小类 的统一结构
export interface Category {
  id: number
  parentId: number | null // null 表示一级大类；非 null 表示二级小类，值为其父类 id
  name: string
  sortOrder: number
  type: RecordType // 该分类属于「收入」还是「支出」
}

// 一条收支记录
export interface Expense {
  id: number
  amountCents: number // 金额，单位：分（用整数存储，避免浮点误差）
  categoryId: number // 二级小类 id
  type: RecordType // 收入 / 支出
  date: string // 格式 YYYY-MM-DD
  note: string | null
  createdAt: number // 时间戳（毫秒）
}

// 前端展示用的收支记录（带解析好的分类名称）
export interface ExpenseWithCategory extends Expense {
  categoryName: string // 二级小类名
  parentName: string // 一级大类名
}

// 前端展示用的分类树（一级大类 + 其下的小类列表）
export interface CategoryTreeNode {
  id: number
  name: string
  type: RecordType
  children: { id: number; name: string }[]
}

// 新增一笔收支时前端传入的数据
export interface AddExpenseInput {
  amountCents: number
  categoryId: number
  type: RecordType
  date: string
  note: string | null
}

// 导出结果
export interface ExportResult {
  canceled: boolean
  path?: string
}

// 导入结果
export interface ImportResult {
  canceled: boolean
  imported: number
  skipped: number
}

// 从 CSV 导入的一行收支
export interface ImportExpenseRow {
  date: string
  amountCents: number
  type: RecordType
  parentName: string
  subName: string
  note: string | null
}
