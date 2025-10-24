import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFHeader, addPDFFooter } from './pdfGenerator';

/**
 * Generate Staff Activity Logs PDF Report
 * This report tracks staff entry and exit activities at different locations
 */
export const generateStaffActivityLogsPDF = (logsData, filterInfo = {}) => {
  console.log("🔍 generateStaffActivityLogsPDF received:", { logsData, filterInfo });
  
  const doc = new jsPDF({ orientation: 'portrait' });

  // Report title
  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Staff Activity Logs Report`
    : 'Staff Activity Logs Report';

  const gymDetails = filterInfo.owner_name 
    ? `Admin: ${filterInfo.owner_name}` 
    : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;

  // Filters section
  if (filterInfo.start_date || filterInfo.end_date || filterInfo.filter_location || filterInfo.filter_activity || filterInfo.search_term) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    
    const filters = [];
    if (filterInfo.start_date && filterInfo.end_date) {
      filters.push(`Period: ${filterInfo.start_date} to ${filterInfo.end_date}`);
    } else if (filterInfo.start_date) {
      filters.push(`From: ${filterInfo.start_date}`);
    } else if (filterInfo.end_date) {
      filters.push(`Until: ${filterInfo.end_date}`);
    }
    if (filterInfo.filter_location) filters.push(`Location: ${filterInfo.filter_location}`);
    if (filterInfo.filter_activity) filters.push(`Activity: ${filterInfo.filter_activity}`);
    if (filterInfo.search_term) filters.push(`Search: "${filterInfo.search_term}"`);

    doc.text(filters.join(' | '), 14, yPosition);
    yPosition += 5;
  }

  // Summary statistics in one row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);

  const colPositions = [14, 70, 130];
  doc.text(`Total Activities: ${logsData.total_activities}`, colPositions[0], yPosition);
  doc.text(`Entries: ${logsData.total_entries}`, colPositions[1], yPosition);
  doc.text(`Exits: ${logsData.total_exits}`, colPositions[2], yPosition);
  yPosition += 8;

  // Table data
  const tableData = logsData.logs.map((log, index) => [
    index + 1,
    log.staff_name || 'N/A',
    log.rfid_tag || 'N/A',
    log.location || 'N/A',
    log.activity_type === 'ENTRY' ? 'Entry' : 'Exit',
    log.timestamp 
      ? new Date(log.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A'
  ]);

  autoTable(doc, {
    startY: yPosition + 5,
    head: [['#', 'Staff Name', 'RFID Tag', 'Location', 'Activity', 'Timestamp']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'center',
    },
    headStyles: {
      fillColor: [55, 65, 81],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10 },   // #
      1: { cellWidth: 40 },   // Staff Name
      2: { cellWidth: 30 },   // RFID Tag
      3: { cellWidth: 25 },   // Location
      4: { cellWidth: 25 },   // Activity
      5: { cellWidth: 45 },   // Timestamp
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 10, right: 10 },
  });

  addPDFFooter(doc);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `staff_activity_logs_${timestamp}.pdf`;
  doc.save(filename);
  
  return filename;
};
