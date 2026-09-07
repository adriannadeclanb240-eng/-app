// CSV 编解码工具

// 字段转义：包含逗号/引号/换行时用双引号包裹，内部引号翻倍
export function escapeCsv(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return '"' + field.replace(/"/g, '""') + '"'
  }
  return field
}

// 二维数组 → CSV 字符串（用 \r\n 换行，Excel 兼容）
export function serializeCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n')
}

// CSV 字符串 → 二维数组（支持引号包裹、转义引号、CRLF/LF、跳过空行）
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((f) => f.trim() !== '')) rows.push(row)
  }
  return rows
}
