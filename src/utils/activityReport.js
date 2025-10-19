import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFHeader, addPDFFooter } from './pdfGenerator';



export const generateSubscriptionActivityPDF = (analyticsData, filterInfo = {}) => {
  console.log("🔍 generateSubscriptionActivityPDF received:", { analyticsData, filterInfo });
  
  const doc = new jsPDF({ orientation: 'portrait' });

 
  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Subscription Activity Report`
    : 'Subscription Activity Report';

  const gymDetails = filterInfo.owner_name 
    ? `Admin: ${filterInfo.owner_name}` 
    : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;


  if (filterInfo.start_date || filterInfo.end_date) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    const dateRange = filterInfo.start_date && filterInfo.end_date
      ? `Period: ${filterInfo.start_date} to ${filterInfo.end_date}`
      : filterInfo.start_date
      ? `From: ${filterInfo.start_date}`
      : `Until: ${filterInfo.end_date}`;
    doc.text(dateRange, 14, yPosition);
    yPosition += 5;
  }


  const entryLogs = analyticsData.entry_logs || [];
  const memberLogins = entryLogs.filter(log => log.visitor_type !== 'Day Pass').length;
  const dayPassLogins = entryLogs.filter(log => log.visitor_type === 'Day Pass').length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Total Logins: ${analyticsData.total_logins || 0}`, 14, yPosition);
  doc.text(`Members: ${memberLogins}`, 80, yPosition);
  doc.text(`Day Pass: ${dayPassLogins}`, 130, yPosition);
  yPosition += 5;
  doc.text(`Peak Hour: ${analyticsData.peak_hour || '—'}`, 14, yPosition);
  yPosition += 8;

 
  const tableData = entryLogs.map((log, index) => [
    index + 1,
    log.full_name || 'N/A',
    log.rfid_tag || 'N/A',
    log.visitor_type || 'Member',
    log.subscription_expiry 
      ? new Date(log.subscription_expiry).toLocaleDateString('en-US', { 
          month: 'short', 
          day: '2-digit', 
          year: 'numeric' 
        })
      : '—',
    log.entry_time 
      ? new Date(log.entry_time).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '—',
    log.exit_time
      ? new Date(log.exit_time).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '—',
    log.status ? log.status.toUpperCase() : 'N/A'
  ]);

  autoTable(doc, {
    startY: yPosition + 5,
    head: [['#', 'Name', 'RFID', 'Type', 'Expiry', 'Entry Time', 'Exit Time', 'Status']],
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
      0: { cellWidth: 8 },    // #
      1: { cellWidth: 32 },   // Name
      2: { cellWidth: 22 },   // RFID
      3: { cellWidth: 18 },   // Type
      4: { cellWidth: 25 },   // Expiry
      5: { cellWidth: 32 },   // Entry Time
      6: { cellWidth: 32 },   // Exit Time
      7: { cellWidth: 20 },   // Status
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 10, right: 10 },
  });

  addPDFFooter(doc);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `subscription_activity_${timestamp}.pdf`;
  doc.save(filename);
  
  return filename;
};

/**
 * Generate Prepaid Activity Analytics PDF Report
 */
export const generatePrepaidActivityPDF = (analyticsData, filterInfo = {}) => {
  console.log("🔍 generatePrepaidActivityPDF received:", { analyticsData, filterInfo });
  
  const doc = new jsPDF({ orientation: 'portrait' });

  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Prepaid Activity Report`
    : 'Prepaid Activity Report';

  const gymDetails = filterInfo.owner_name 
    ? `Admin: ${filterInfo.owner_name}` 
    : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;

  if (filterInfo.start_date || filterInfo.end_date) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    const dateRange = filterInfo.start_date && filterInfo.end_date
      ? `Period: ${filterInfo.start_date} to ${filterInfo.end_date}`
      : filterInfo.start_date
      ? `From: ${filterInfo.start_date}`
      : `Until: ${filterInfo.end_date}`;
    doc.text(dateRange, 14, yPosition);
    yPosition += 5;
  }

  const entryLogs = analyticsData.entry_logs || [];
  const memberLogins = entryLogs.filter(log => log.visitor_type !== 'Day Pass').length;
  const dayPassLogins = entryLogs.filter(log => log.visitor_type === 'Day Pass').length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0);
  
  const summaryY = yPosition;
  doc.text(`Total Logins: ${analyticsData.total_logins || 0}`, 14, summaryY);
  doc.text(`Members: ${memberLogins}`, 70, summaryY);
  doc.text(`Day Pass: ${dayPassLogins}`, 120, summaryY);
  doc.text(`Peak Hour: ${analyticsData.peak_hour || '—'}`, 170, summaryY);
  
  yPosition += 8;

 const tableData = entryLogs.map((log, index) => [
  index + 1,
  log.full_name || 'N/A',
  log.rfid_tag || 'N/A',
  log.visitor_type || 'Member',
  log.deducted_amount != null ? log.deducted_amount : '—',
  log.remaining_balance != null ? log.remaining_balance : '—',
  log.entry_time
    ? new Date(log.entry_time).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—',
  log.exit_time
    ? new Date(log.exit_time).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—',
  log.status ? log.status.toUpperCase() : 'N/A',
]);



  autoTable(doc, {
    startY: yPosition + 5,
    head: [['#', 'Name', 'RFID', 'Type', 'Deducted', 'Balance', 'Entry Time', 'Exit Time', 'Status']],
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
      0: { cellWidth: 8 },    // #
      1: { cellWidth: 28 },   // Name
      2: { cellWidth: 20 },   // RFID
      3: { cellWidth: 16 },   // Type
      4: { cellWidth: 20 },   // Deducted (centered)
      5: { cellWidth: 20 },   // Balance (centered)
      6: { cellWidth: 30 },   // Entry Time
      7: { cellWidth: 30 },   // Exit Time
      8: { cellWidth: 17 },   // Status
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 10, right: 10 },
  });

  addPDFFooter(doc);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `prepaid_activity_${timestamp}.pdf`;
  doc.save(filename);
  
  return filename;
};
