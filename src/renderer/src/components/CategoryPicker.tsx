import type { CategoryTreeNode } from '../../../shared/types'
import { categoryEmoji } from '../utils'

interface Props {
  categories: CategoryTreeNode[]
  value: number | null // 选中的二级小类 id
  onChange: (id: number | null) => void
}

function CategoryPicker({ categories, value, onChange }: Props): React.JSX.Element {
  const selectedTop = categories.find((c) => c.children.some((ch) => ch.id === value)) ?? null

  // 切换一级大类时，默认选中其第一个二级小类
  const handleTopChange = (topId: string): void => {
    const top = categories.find((c) => c.id === Number(topId))
    if (top && top.children.length > 0) {
      onChange(top.children[0].id)
    } else {
      onChange(null)
    }
  }

  return (
    <>
      <div className="field">
        <label>一级分类</label>
        <select
          value={selectedTop ? String(selectedTop.id) : ''}
          onChange={(e) => handleTopChange(e.target.value)}
        >
          <option value="" disabled>
            请选择
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryEmoji(c.name)} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>二级分类</label>
        <select
          value={value !== null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={!selectedTop}
        >
          <option value="" disabled>
            请选择
          </option>
          {(selectedTop?.children ?? []).map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export default CategoryPicker
