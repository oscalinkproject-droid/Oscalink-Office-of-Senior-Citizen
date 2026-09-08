import Papa from 'papaparse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jsPDF: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let autoTable: any;

type DataRow = Record<string, unknown>;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const name = `${prefix}_${timestamp}.${extension}`;
  console.log(`[OSCALink-Export] Preparing download: ${name}`);
  return name;
}

function downloadFile(content: Blob | string, filename: string, mimeType: string) {
  let blob: Blob;
  
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Hardened download attribute for institutional naming
  link.setAttribute('download', filename);
  link.setAttribute('type', mimeType);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup to prevent memory leaks in the browser session
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

interface MunicipalConfig {
  id?: number;
  mayor_name?: string;
  mayor_signature_url?: string;
  osca_head_name?: string;
  osca_head_signature_url?: string;
  municipality_name?: string;
  certify?: boolean;
}

export async function generatePDF(title: string, data: DataRow[], columns: string[], config?: MunicipalConfig, orientation: 'portrait' | 'landscape' = 'portrait') {
  if (!jsPDF) {
    jsPDF = (await import('jspdf')).default;
  }
  if (!autoTable) {
    autoTable = (await import('jspdf-autotable')).default;
  }
  
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Premium BARMM branding headers
  doc.setFillColor(0, 104, 55); // BARMM Green
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(253, 185, 19); // BARMM Gold
  doc.rect(0, 8, pageWidth, 2, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(0, 104, 55); // Green title
  doc.setFont("helvetica", "bold");
  doc.text('OSCALink: Institutional Report', 14, 25);
  
  doc.setFontSize(13);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 33);
  
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);
  if (config?.municipality_name) {
    doc.text(`Municipality: ${config.municipality_name}`, 14, 45);
  }

  let startY = 52;
  
  // Calculate KPI metrics based on report type to display visual KPI blocks
  const kpis: { label: string; value: string; color: [number, number, number] }[] = [];
  
  if (title.includes("Demographic")) {
    const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0);
    kpis.push({ label: "TOTAL REGISTERED SENIORS", value: String(total), color: [0, 104, 55] });
  } else if (title.includes("Assistance")) {
    const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const pending = data.reduce((sum, item) => sum + Number(item.pending || 0), 0);
    const released = data.reduce((sum, item) => sum + Number(item.released || 0), 0);
    kpis.push(
      { label: "TOTAL ASSISTANCE REQUESTS", value: String(total), color: [0, 104, 55] },
      { label: "PENDING REQUESTS", value: String(pending), color: [253, 185, 19] },
      { label: "RELEASED FUNDS", value: String(released), color: [16, 185, 129] }
    );
  } else if (title.includes("Compliance") || title.includes("Service")) {
    const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0);
    kpis.push({ label: "TOTAL SERVICE DELIVERIES", value: String(total), color: [0, 104, 55] });
  } else if (title === "Master Report" || title === "master_report") {
    const totalSeniors = data.filter(d => d.type === "Demographic").reduce((sum, item) => sum + Number(item.count || 0), 0);
    const totalRequests = data.filter(d => d.type === "Assistance").reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalCompliance = data.filter(d => d.type === "Compliance").reduce((sum, item) => sum + Number(item.count || 0), 0);
    kpis.push(
      { label: "TOTAL SENIORS", value: String(totalSeniors), color: [0, 104, 55] },
      { label: "TOTAL ASSISTANCE REQUESTS", value: String(totalRequests), color: [253, 185, 19] },
      { label: "COMPLIANCE RECORDS", value: String(totalCompliance), color: [16, 185, 129] }
    );
  }
  
  // Draw KPI Cards if there are any
  if (kpis.length > 0) {
    const cardWidth = (182 - (kpis.length - 1) * 6) / kpis.length;
    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + 6);
      
      // Draw card background with green/grey accent
      doc.setFillColor(245, 248, 245);
      doc.setDrawColor(220, 225, 220);
      doc.rect(x, 50, cardWidth, 20, 'FD');
      
      // Draw colored indicator line on left of the card
      doc.setFillColor(...kpi.color);
      doc.rect(x, 50, 3, 20, 'F');
      
      // Draw KPI Label
      doc.setFontSize(6.5);
      doc.setTextColor(120);
      doc.setFont("helvetica", "bold");
      doc.text(kpi.label, x + 7, 56);
      
      // Draw KPI Value
      doc.setFontSize(13);
      doc.setTextColor(30);
      doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + 7, 65);
    });
    
    startY = 78;
  }

  // Draw table(s)
  if (title === "Master Report" || title === "master_report") {
    // Separate data for premium layout in master report
    const demographicData = data.filter(d => d.type === "Demographic").map(item => [String(item.barangay ?? '-'), String(item.count ?? '-')]);
    const assistanceData = data.filter(d => d.type === "Assistance").map(item => [String(item.category ?? '-'), String(item.total ?? '-'), String(item.pending ?? '-'), String(item.released ?? '-')]);
    const complianceData = data.filter(d => d.type === "Compliance").map(item => [String(item.status ?? '-'), String(item.count ?? '-')]);

    // 1. Demographics Table
    doc.setFontSize(10);
    doc.setTextColor(0, 104, 55);
    doc.setFont("helvetica", "bold");
    doc.text("Demographic Distribution by Barangay", 14, startY);
    
    autoTable(doc, {
      startY: startY + 4,
      head: [["BARANGAY", "SENIOR COUNT"]],
      body: demographicData,
      theme: 'striped',
      headStyles: { fillColor: [0, 104, 55], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [245, 248, 245] },
    });
    
    // 2. Assistance Table
    const nextY1 = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100) + 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 104, 55);
    doc.setFont("helvetica", "bold");
    doc.text("Assistance Category Metrics", 14, nextY1);
    
    autoTable(doc, {
      startY: nextY1 + 4,
      head: [["CATEGORY", "TOTAL REQUESTS", "PENDING", "RELEASED"]],
      body: assistanceData,
      theme: 'striped',
      headStyles: { fillColor: [0, 104, 55], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [245, 248, 245] },
    });
    
    // 3. Compliance Table
    const nextY2 = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100) + 10;
    
    // Ensure we don't start table too low or it automatically creates new page nicely
    if (nextY2 > 240) {
      doc.addPage();
      doc.setFontSize(10);
      doc.setTextColor(0, 104, 55);
      doc.setFont("helvetica", "bold");
      doc.text("Service Delivery Compliance", 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [["STATUS", "RECORD COUNT"]],
        body: complianceData,
        theme: 'striped',
        headStyles: { fillColor: [0, 104, 55], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(0, 104, 55);
      doc.setFont("helvetica", "bold");
      doc.text("Service Delivery Compliance", 14, nextY2);
      autoTable(doc, {
        startY: nextY2 + 4,
        head: [["STATUS", "RECORD COUNT"]],
        body: complianceData,
        theme: 'striped',
        headStyles: { fillColor: [0, 104, 55], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
      });
    }
  } else {
    const tableRows = data.map(item => columns.map(col => String(item[col] ?? '-')));

    // Explicit column widths so long columns (Full Name) don't collapse to 1 char per line.
    const widthMap: Record<string, number> = {
      'FULL NAME': 52, 'REGISTRATION ID': 24, 'ID NUMBER': 22, 'BIRTHDATE': 18,
      'SEX': 12, 'BARANGAY': 30, 'PUROK': 16, 'CONTACT NUMBER': 24,
      'CLASSIFICATION': 20, 'PENSIONER': 12, 'STATUS': 14, 'REGISTERED ON': 26,
    };
    const columnStyles: Record<number, { cellWidth: number }> = {};
    columns.forEach((c, idx) => {
      const key = c.replace(/_/g, ' ').toUpperCase();
      const w = widthMap[key];
      if (w) columnStyles[idx] = { cellWidth: w };
    });

    autoTable(doc, {
      startY: startY,
      head: [columns.map(c => c.replace(/_/g, ' ').toUpperCase())],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [0, 104, 55], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'left' },
      styles: { fontSize: 8, cellPadding: 3, textColor: 60, lineColor: [240, 240, 240] },
      alternateRowStyles: { fillColor: [245, 248, 245] },
      columnStyles,
      didDrawPage: (pageData: { pageNumber: number }) => {
        // Footer page numbering
        const totalPages = doc.internal.getNumberOfPages();
        const str = `Page ${pageData.pageNumber} of ${totalPages}`;
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(str, pageWidth - 14, pageHeight - 10, { align: 'right' });
        doc.text('OSCALink Cotabato City Office - CONFIDENTIAL REPORT', 14, pageHeight - 10);
      }
    });
  }

  // Draw Page Numbering and Footer for multi-table document manually since didDrawPage is only per autoTable
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    doc.text('OSCALink Cotabato City Office - CONFIDENTIAL INSTITUTIONAL REPORT', 14, pageHeight - 10);
  }

  // Certification Section
  if (config?.certify) {
    doc.setPage(totalPages);
    const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100) + 20;
    
    // Check if we need a new page
    if (finalY > 230) {
      doc.addPage();
    }
    
    const startY = finalY > 230 ? 30 : finalY;
    
    // Draw box around certification (executive borders)
    doc.setDrawColor(220, 225, 220); // border light green/gray
    doc.setFillColor(250, 252, 250); // gray-green background
    doc.rect(14, startY - 10, 182, 50, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "bold");
    doc.text('CERTIFIED CORRECT BY:', 20, startY);

    // Mayor Signature Line
    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.text(config.mayor_name || 'Municipal Mayor', 20, startY + 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text('Municipal Mayor', 20, startY + 29);
    
    if (config.mayor_signature_url) {
       try {
         doc.addImage(config.mayor_signature_url, 'PNG', 20, startY + 4, 35, 12);
       } catch (e) {
         console.error("Could not add Mayor signature to PDF", e);
         doc.line(20, startY + 20, 60, startY + 20);
       }
    } else {
       doc.line(20, startY + 20, 60, startY + 20);
    }

    // OSCA Head Signature Line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.text(config.osca_head_name || 'OSCA Head', 120, startY + 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text('OSCA Head', 120, startY + 29);
    
    if (config.osca_head_signature_url) {
       try {
         doc.addImage(config.osca_head_signature_url, 'PNG', 120, startY + 4, 35, 12);
       } catch (e) {
         console.error("Could not add OSCA Head signature to PDF", e);
         doc.line(120, startY + 20, 160, startY + 20);
       }
    } else {
       doc.line(120, startY + 20, 160, startY + 20);
    }
  }

  const pdfBlob = doc.output('blob');
  const filename = generateFilename(`oscalink_${sanitizeFilename(title)}_report`, 'pdf');
  downloadFile(pdfBlob, filename, 'application/pdf');
}

export function generateCSV(reportName: string, data: DataRow[]) {
  const csv = Papa.unparse(data, {
    quotes: true,
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ',',
    header: true,
    newline: '\r\n',
  });

  const filename = generateFilename(`oscalink_${sanitizeFilename(reportName)}`, 'csv');
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

export function generatePhilHealthCSV(data: DataRow[]): string {
  const philHealthData = data.map(row => ({
    'PHILHEALTH_ID_NO': String(row.philhealth_no ?? ''),
    'LAST_NAME': String(row.full_name ?? '').split(' ').slice(-1)[0] ?? '',
    'FIRST_NAME': String(row.full_name ?? '').split(' ').slice(0, -1).join(' ') ?? '',
    'MIDDLE_NAME': String(row.middle_name ?? ''),
    'SUFFIX': String(row.suffix ?? ''),
    'BIRTHDATE': String(row.birthdate ?? ''),
    'SEX': String(row.sex ?? ''),
    'CIVIL_STATUS': String(row.civil_status ?? ''),
    'BARANGAY': String(row.barangay ?? ''),
    'PUROK': String(row.purok ?? ''),
    'ADDRESS': String(row.address ?? ''),
    'CONTACT_NUMBER': String(row.contact_number ?? ''),
    'REGISTRATION_ID': String(row.registration_id ?? ''),
    'CLASSIFICATION': String(row.classification ?? ''),
    'STATUS': String(row.status ?? ''),
  }));

  const csv = Papa.unparse(philHealthData, {
    quotes: true,
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ',',
    header: true,
    newline: '\r\n',
  });

  const filename = generateFilename('oscalink_philhealth_export', 'csv');
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  return filename;
}

export async function generateExcel(title: string, data: DataRow[], columns: string[]) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    if (title.includes("master") || title.includes("Master") || title.includes("overview")) {
      // 1. Overview Sheet with KPI blocks
      const totalSeniors = data.filter(d => d.type === "Demographic").reduce((sum, item) => sum + Number(item.count || 0), 0);
      const totalRequests = data.filter(d => d.type === "Assistance").reduce((sum, item) => sum + Number(item.total || 0), 0);
      const totalCompliance = data.filter(d => d.type === "Compliance").reduce((sum, item) => sum + Number(item.count || 0), 0);
      
      const overviewData = [
        { "METRIC": "Report Title", "VALUE": "OSCALink Master Report Summary" },
        { "METRIC": "Generated Date", "VALUE": new Date().toLocaleString() },
        { "METRIC": "Total Registered Seniors", "VALUE": totalSeniors },
        { "METRIC": "Total Assistance Requests", "VALUE": totalRequests },
        { "METRIC": "Total Service Deliveries", "VALUE": totalCompliance }
      ];
      const wsOverview = XLSX.utils.json_to_sheet(overviewData);
      wsOverview['!cols'] = [{ wch: 30 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, wsOverview, 'Summary Overview');

      // 2. Demographics Sheet
      const demoRows = data.filter(d => d.type === "Demographic").map(item => ({
        "BARANGAY": item.barangay ?? '-',
        "SENIOR COUNT": item.count ?? 0
      }));
      const wsDemo = XLSX.utils.json_to_sheet(demoRows);
      wsDemo['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, wsDemo, 'Demographics');

      // 3. Assistance Metrics Sheet
      const assistRows = data.filter(d => d.type === "Assistance").map(item => ({
        "CATEGORY": item.category ?? '-',
        "TOTAL REQUESTS": item.total ?? 0,
        "PENDING": item.pending ?? 0,
        "RELEASED": item.released ?? 0
      }));
      const wsAssist = XLSX.utils.json_to_sheet(assistRows);
      wsAssist['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, wsAssist, 'Assistance Metrics');

      // 4. Service Compliance Sheet
      const compRows = data.filter(d => d.type === "Compliance").map(item => ({
        "STATUS": item.status ?? '-',
        "RECORD COUNT": item.count ?? 0
      }));
      const wsComp = XLSX.utils.json_to_sheet(compRows);
      wsComp['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, wsComp, 'Service Compliance');
    } else {
      // Normal single sheet with styled auto-fit columns
      const worksheetData = data.map(row => {
        const formattedRow: Record<string, unknown> = {};
        columns.forEach(col => {
          const header = col.replace(/_/g, ' ').toUpperCase();
          formattedRow[header] = row[col] ?? '-';
        });
        return formattedRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      const colWidths = columns.map(col => {
        const header = col.replace(/_/g, ' ').toUpperCase();
        let maxLen = header.length;
        data.forEach(row => {
          const valStr = String(row[col] ?? '');
          if (valStr.length > maxLen) {
            maxLen = valStr.length;
          }
        });
        return { wch: maxLen + 4 }; // Pad for visual clarity
      });
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = generateFilename(`oscalink_${sanitizeFilename(title)}_report`, 'xlsx');
    downloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch (error) {
    console.error("Excel generation failed, falling back to CSV", error);
    generateCSV(title, data);
  }
}
