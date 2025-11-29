//===============================================================
//Script Name: csv.js
//Script Location: src/lib/csv.js
//Date: 11/28/2025
//Created By: T03KNEE
//Version: 1.1.1
//About: Export data arrays to CSV file download.
//       Updated: Adds BOM for correct Excel character rendering.
//===============================================================

export function downloadCsv(data, columns, filename) {
  if (!data || !data.length) return

  // 1. Build Header Row
  const headerRow = columns.map(col => `"${col.header}"`).join(',')
  
  // 2. Build Data Rows
  const rows = data.map(item => {
    return columns.map(col => {
      // Get value
      let val = item[col.key]

      // Handle missing/null
      if (val === null || val === undefined) {
        val = ''
      }

      // Convert numbers/booleans to string
      val = String(val)

      // Escape double quotes by doubling them (CSV standard)
      val = val.replace(/"/g, '""')

      // Wrap in quotes to handle commas/newlines in text
      return `"${val}"`
    }).join(',')
  })

  // 3. Combine
  const csvString = [headerRow, ...rows].join('\n')

  // 4. Trigger Download
  // \uFEFF is the UTF-8 Byte Order Mark (BOM). 
  // It tells Excel "This is UTF-8", fixing the strange characters.
  const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' })
  
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('hidden', '')
  a.setAttribute('href', url)
  a.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}