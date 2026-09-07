import { contextBridge, ipcRenderer } from 'electron'
import type {
  CategoryTreeNode,
  ExpenseWithCategory,
  AddExpenseInput,
  ExportResult,
  ImportResult,
  RecordType
} from '../shared/types'

// 通过 contextBridge 安全地把主进程的能力暴露给前端界面
const api = {
  listCategories: (): Promise<CategoryTreeNode[]> => ipcRenderer.invoke('categories:list'),
  addExpense: (input: AddExpenseInput): Promise<void> => ipcRenderer.invoke('expenses:add', input),
  listExpenses: (): Promise<ExpenseWithCategory[]> => ipcRenderer.invoke('expenses:list'),
  deleteExpense: (id: number): Promise<void> => ipcRenderer.invoke('expenses:delete', id),
  addCategory: (parentId: number | null, name: string, type: RecordType): Promise<void> =>
    ipcRenderer.invoke('categories:add', { parentId, name, type }),
  renameCategory: (id: number, name: string): Promise<void> =>
    ipcRenderer.invoke('categories:rename', { id, name }),
  deleteCategory: (id: number): Promise<void> => ipcRenderer.invoke('categories:delete', id),
  exportData: (): Promise<ExportResult> => ipcRenderer.invoke('data:export'),
  importData: (): Promise<ImportResult> => ipcRenderer.invoke('data:import'),
  getBudget: (): Promise<number> => ipcRenderer.invoke('budget:get'),
  setBudget: (cents: number): Promise<void> => ipcRenderer.invoke('budget:set', cents)
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
