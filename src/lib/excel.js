//===============================================================
//Script Name: excel.js
//Script Location: src/lib/excel.js
//Date: 11/28/2025
//Created By: T03KNEE
//Version: 2.0.0
//About: Generates professional .xlsx files with styling,
//       colors, and specific column formatting.
//===============================================================

import ExcelJS from 'exceljs'

export async function downloadExcel(data, columns, filename) {
  if (!data || !data.length) return

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Reload Data')

  // 1. Define Columns & Widths
  // We map your 'key' to the column key, and 'header' to the label.
  // We assign a default width of 20 for readability.
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20, // Default width if not specified
    style: { 
      alignment: { horizontal: 'left' } // FORCE LEFT ALIGNMENT
    }
  }))

  // 2. Add Data Rows
  worksheet.addRows(data)

  // 3. Style the Header Row (Row 1)
  const headerRow = worksheet.getRow(1)
  
  headerRow.eachCell((cell) => {
    // Styling: Bold Font
    cell.font = {
      name: 'Arial',
      family: 2,
      size: 10,
      bold: true,
      color: { argb: 'FF000000' } // Black text
    }

    // Styling: Lighter Background (Slate-200 look)
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' } // Light Gray/Slate
    }

    // Styling: Borders
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } // Slate-400 border
    }
    
    // Force alignment on header too
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })

  // Make header slightly taller
  headerRow.height = 24

  // 4. Generate Buffer & Download
  const buffer = await workbook.xlsx.writeBuffer()
  
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.setAttribute('hidden', '')
  a.setAttribute('href', url)
  a.setAttribute('download', `${filename}.xlsx`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}