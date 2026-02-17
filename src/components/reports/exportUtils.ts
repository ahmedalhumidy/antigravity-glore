interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export async function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
) {
  const XLSX = await import('xlsx');
  
  const headers = columns.map(c => c.header);
  const rows = data.map(row => columns.map(c => row[c.key] ?? ''));
  
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = columns.map(c => ({ wch: c.width || 15 }));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rapor');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title: string
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);
  
  const headers = columns.map(c => c.header);
  const rows = data.map(row => columns.map(c => String(row[c.key] ?? '')));
  
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  doc.save(`${filename}.pdf`);
}
