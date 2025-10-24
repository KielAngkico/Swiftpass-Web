import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFHeader, addPDFFooter } from './pdfGenerator';

/**
 * Calculate duration between login and logout
 */
const calculateDuration = (loginTime, logoutTime) => {
  if (!logoutTime) return "Active";
  const login = new Date(loginTime);
  const logout = new Date(logoutTime);
  const diff = logout - login;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

/**
 * Generate Staff Session Logs PDF Report
 * This report tracks staff login/logout sessions and working hours
 */
export const generateStaffSessionLogsPDF = (logsData, filterInfo = {}) => {
  console.log("🔍 generateStaffSessionLogsPDF received:", { logsData, filterInfo });
  
  const doc = new jsPDF({ orientation: 'portrait' });

  // Report title
  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Staff Session Logs Report`
    : 'Staff Session Logs Report';

  const gymDetails = filterInfo.owner_name 
    ? `Admin: ${filterInfo.owner_name}` 
    : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;

  // Filter information
  if (filterInfo.start_date || filterInfo.end_date || filterInfo.selected_staff) {
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
    if (filterInfo.selected_staff) {
      filters.push(`Staff: ${filterInfo.selected_staff}`);
    }

    doc.text(filters.join(' | '), 14, yPosition);
    yPosition += 5;
  }

  // Summary statistics
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);

  const colPositions = [14, 60, 105, 150];
  doc.text(`Sessions: ${logsData.total_sessions}`, colPositions[0], yPosition);
  doc.text(`Online: ${logsData.online_sessions}`, colPositions[1], yPosition);
  doc.text(`Offline: ${logsData.offline_sessions}`, colPositions[2], yPosition);
  doc.text(`Hours: ${logsData.total_hours}`, colPositions[3], yPosition);
  yPosition += 8;

  // Table data
  const tableData = logsData.logs.map((log, index) => [
    index + 1,
    log.staff_name || 'N/A',
    log.login_time 
      ? new Date(log.login_time).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A',
    log.logout_time 
      ? new Date(log.logout_time).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-',
    calculateDuration(log.login_time, log.logout_time),
    log.status === 'online' ? 'Online' : 'Offline'
  ]);

  // Calculate available width for table
  const pageWidth = doc.internal.pageSize.width;
  const margins = { left: 10, right: 10 };
  const tableWidth = pageWidth - margins.left - margins.right;

  autoTable(doc, {
    startY: yPosition + 5,
    head: [['#', 'Staff', 'Login', 'Logout', 'Duration', 'Status']],
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
      1: { cellWidth: 38 },   // Staff Name
      2: { cellWidth: 38 },   // Login Time
      3: { cellWidth: 38 },   // Logout Time
      4: { cellWidth: 28 },   // Duration
      5: { cellWidth: 23 },   // Status
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: margins,
    tableWidth: 'auto',
  });

  addPDFFooter(doc);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `staff_session_logs_${timestamp}.pdf`;
  doc.save(filename);
  
  return filename;
};

