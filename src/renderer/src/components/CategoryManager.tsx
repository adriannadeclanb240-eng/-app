import { useState } from 'react'
import type { CategoryTreeNode, RecordType } from '../../../shared/types'
import { categoryEmoji } from '../utils'

interface Props {
  categories: CategoryTreeNode[]
  onAdd: (parentId: number | null, name: string, type: RecordType) => Promise<void>
  onRename: (id: number, name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

function CategoryManager({ categories, onAdd, onRename, onDelete }: Props): React.JSX.Element {
  const [addTopType, setAddTopType] = useState<RecordType | null>(null)
  const [topName, setTopName] = useState('')
  const [addSubFor, setAddSubFor] = useState<number | null>(null)
  const [subName, setSubName] = useState('')
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameName, setRenameName] = useState('')
  const [error, setError] = useState('')

  const valid = (name: string): boolean => name.trim().length > 0

  const submitTop = async (): Promise<void> => {
    if (!valid(topName)) {
      setError('请输入分类名称')
      return
    }
    await onAdd(null, topName.trim(), addTopType as RecordType)
    setTopName('')
    setAddTopType(null)
    setError('')
  }

  const submitSub = async (type: RecordType): Promise<void> => {
    if (!valid(subName)) {
      setError('请输入分类名称')
      return
    }
    await onAdd(addSubFor, subName.trim(), type)
    setSubName('')
    setAddSubFor(null)
    setError('')
  }

  const submitRename = async (): Promise<void> => {
    if (!valid(renameName)) {
      setError('请输入分类名称')
      return
    }
    await onRename(renameId as number, renameName.trim())
    setRenameId(null)
    setError('')
  }

  const confirmDelete = async (id: number, name: string, isTop: boolean): Promise<void> => {
    const msg = isTop
      ? `确定删除大类「${name}」及其所有小类吗？\n该分类下的记录会自动归到同类型的「其他」。`
      : `确定删除小类「${name}」吗？\n该分类下的记录会自动归到同类型的「其他」。`
    if (window.confirm(msg)) {
      await onDelete(id)
    }
  }

  const renameInput = (): React.JSX.Element => (
    <div className="category-row">
      <input
        className="inline-input"
        value={renameName}
        onChange={(e) => setRenameName(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitRename()
          if (e.key === 'Escape') setRenameId(null)
        }}
      />
      <button className="btn btn-primary btn-sm" onClick={submitRename}>
        确定
      </button>
      <button className="btn btn-sm" onClick={() => setRenameId(null)}>
        取消
      </button>
    </div>
  )

  const renderTree = (list: CategoryTreeNode[], type: RecordType): React.JSX.Element => (
    <>
      {list.map((top) => (
        <div key={top.id} className="category-top">
          {renameId === top.id ? (
            renameInput()
          ) : (
            <div className="category-row">
              <span className="category-name">
                {categoryEmoji(top.name)} {top.name}
              </span>
              <span className="category-actions">
                <button
                  className="btn btn-link"
                  onClick={() => {
                    setRenameId(top.id)
                    setRenameName(top.name)
                  }}
                >
                  重命名
                </button>
                <button
                  className="btn btn-link"
                  onClick={() => {
                    setAddSubFor(top.id)
                    setSubName('')
                  }}
                >
                  + 小类
                </button>
                <button className="btn btn-danger" onClick={() => confirmDelete(top.id, top.name, true)}>
                  删除
                </button>
              </span>
            </div>
          )}

          {top.children.map((sub) => (
            <div key={sub.id}>
              {renameId === sub.id ? (
                <div className="category-row category-sub">{renameInput()}</div>
              ) : (
                <div className="category-row category-sub">
                  <span className="category-name">{sub.name}</span>
                  <span className="category-actions">
                    <button
                      className="btn btn-link"
                      onClick={() => {
                        setRenameId(sub.id)
                        setRenameName(sub.name)
                      }}
                    >
                      重命名
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => confirmDelete(sub.id, sub.name, false)}
                    >
                      删除
                    </button>
                  </span>
                </div>
              )}
            </div>
          ))}

          {addSubFor === top.id && (
            <div className="category-row category-sub">
              <input
                className="inline-input"
                placeholder="新小类名称"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSub(type)
                  if (e.key === 'Escape') setAddSubFor(null)
                }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => submitSub(type)}>
                确定
              </button>
              <button className="btn btn-sm" onClick={() => setAddSubFor(null)}>
                取消
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  )

  const addTopInput = (): React.JSX.Element => (
    <div className="category-row">
      <input
        className="inline-input"
        placeholder="新大类名称"
        value={topName}
        onChange={(e) => setTopName(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitTop()
          if (e.key === 'Escape') setAddTopType(null)
        }}
      />
      <button className="btn btn-primary btn-sm" onClick={submitTop}>
        确定
      </button>
      <button className="btn btn-sm" onClick={() => setAddTopType(null)}>
        取消
      </button>
    </div>
  )

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="category-group-title">支出分类</div>
      <div className="category-list">{renderTree(expenseCategories, 'expense')}</div>
      {addTopType === 'expense' ? (
        addTopInput()
      ) : (
        <button
          className="btn btn-outline"
          onClick={() => {
            setAddTopType('expense')
            setTopName('')
          }}
        >
          + 添加支出大类
        </button>
      )}

      <div className="category-group-title">收入分类</div>
      <div className="category-list">{renderTree(incomeCategories, 'income')}</div>
      {addTopType === 'income' ? (
        addTopInput()
      ) : (
        <button
          className="btn btn-outline"
          onClick={() => {
            setAddTopType('income')
            setTopName('')
          }}
        >
          + 添加收入大类
        </button>
      )}
    </div>
  )
}

export default CategoryManager
