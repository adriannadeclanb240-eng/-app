import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync } from 'fs'
import {
  initDb,
  listCategoryTree,
  addExpense,
  listExpenses,
  deleteExpense,
  addCategory,
  renameCategory,
  deleteCategory,
  exportCsv,
  importExpenses,
  getBudget,
  setBudget
} from './db'
import { parseCsv } from './csv'
import type { AddExpenseInput, ImportExpenseRow, RecordType } from '../shared/types'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: '个人账本',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 外部链接用系统浏览器打开，不在应用内打开新窗口
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发模式下 electron-vite 会注入开发服务器地址
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 今天的日期（用于导出文件名）
function todayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 金额字符串（元）→ 分；非法返回 null
function parseAmountToCents(s: string | undefined): number | null {
  const t = (s ?? '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  const cents = Math.round(parseFloat(t) * 100)
  return cents > 0 ? cents : null
}

// CSV 行 → 合法的导入数据；非法返回 null
function parseImportRow(row: string[]): ImportExpenseRow | null {
  const [date, amount, type, parentName, subName, note] = row
  const d = (date ?? '').trim()
  const t = (type ?? '').trim()
  const p = (parentName ?? '').trim()
  const s = (subName ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const cents = parseAmountToCents(amount)
  if (cents === null) return null
  if (t !== '收入' && t !== '支出') return null
  if (!p || !s) return null
  const n = (note ?? '').trim()
  return {
    date: d,
    amountCents: cents,
    type: t === '收入' ? 'income' : 'expense',
    parentName: p,
    subName: s,
    note: n ? n : null
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('categories:list', () => listCategoryTree())
  ipcMain.handle(
    'categories:add',
    (_e, args: { parentId: number | null; name: string; type: RecordType }) =>
      addCategory(args.parentId, args.name, args.type)
  )
  ipcMain.handle('categories:rename', (_e, args: { id: number; name: string }) =>
    renameCategory(args.id, args.name)
  )
  ipcMain.handle('categories:delete', (_e, id: number) => deleteCategory(id))
  ipcMain.handle('expenses:add', (_e, input: AddExpenseInput) => addExpense(input))
  ipcMain.handle('expenses:list', () => listExpenses())
  ipcMain.handle('expenses:delete', (_e, id: number) => deleteExpense(id))

  ipcMain.handle('data:export', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      title: '导出账单',
      defaultPath: `个人账本-导出-${todayDateStr()}.csv`,
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return { canceled: true }
    writeFileSync(filePath, '﻿' + exportCsv(), 'utf-8')
    return { canceled: false, path: filePath }
  })

  ipcMain.handle('data:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      title: '导入账单',
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { canceled: true }
    const text = readFileSync(filePaths[0], 'utf-8')
    const rows = parseCsv(text).slice(1) // 跳过表头
    const valid: ImportExpenseRow[] = []
    let skipped = 0
    for (const row of rows) {
      const parsed = parseImportRow(row)
      if (parsed) valid.push(parsed)
      else skipped++
    }
    importExpenses(valid)
    return { canceled: false, imported: valid.length, skipped }
  })

  ipcMain.handle('budget:get', () => getBudget())
  ipcMain.handle('budget:set', (_e, cents: number) => setBudget(cents))
}

app.whenReady().then(() => {
  initDb()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
