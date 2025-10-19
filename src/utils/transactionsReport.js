import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFHeader, addPDFFooter } from './pdfGenerator';

/**
 * Generate Subscription Transactions PDF Report
 */
export const generateSubscriptionTransactionsPDF = (transactionsData, filterInfo = {}) => {
  console.log("🔍 generateSubscriptionTransactionsPDF received:", { transactionsData, filterInfo });
  
  const doc = new jsPDF({ orientation: 'portrait' });


  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Subscription Transactions Report`
    : 'Subscription Transactions Report';

  const gymDetails = filterInfo.owner_name 
    ? `Admin: ${filterInfo.owner_name}` 
    : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;


  if (filterInfo.start_date || filterInfo.end_date || filterInfo.filter_type || filterInfo.filter_method || filterInfo.search_term) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    
    const filters = [];
    if (filterInfo.start_date && filterInfo.end_date) {
      filters.push(`Period: ${filterInfo.start_date} to ${filterInfo.end_date}`);
    }
    if (filterInfo.filter_type) filters.push(`Type: ${filterInfo.filter_type}`);
    if (filterInfo.filter_method) filters.push(`Method: ${filterInfo.filter_method}`);
    if (filterInfo.search_term) filters.push(`Search: "${filterInfo.search_term}"`);

    doc.text(filters.join(' | '), 14, yPosition);
    yPosition += 5;
  }


  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);

  const colPositions = [14, 65, 110, 155]; 
  doc.text(`Total Revenue: ${transactionsData.total_revenue.toFixed(2)}`, colPositions[0], yPosition);
  doc.text(`Transactions: ${transactionsData.total_transactions}`, colPositions[1], yPosition);
  doc.text(`Cash: ${transactionsData.cash_revenue.toFixed(2)}`, colPositions[2], yPosition);
  doc.text(`Cashless: ${transactionsData.cashless_revenue.toFixed(2)}`, colPositions[3], yPosition);
  yPosition += 8;


  const mapTransactionType = (type) => {
    if (type === 'day_pass_session') return 'Daypass';
    if (type === 'renewal') return 'Renewal';
    if (type === 'new_membership') return 'New Membership';
    return type || 'N/A';
  };

  const tableData = transactionsData.transactions.map((txn, index) => [
    index + 1,
    txn.member_name || 'N/A',
    mapTransactionType(txn.transaction_type),
    txn.plan_name || 'N/A',
    parseFloat(txn.amount || 0).toFixed(2),
    txn.payment_method || 'N/A',
    txn.staff_name || 'N/A',
    txn.transaction_date 
      ? new Date(txn.transaction_date).toLocaleString('en-US', {
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
    head: [['#', 'Member Name', 'Type', 'Plan', 'Amount', 'Method', 'Staff', 'Transaction Date']],
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
      1: { cellWidth: 30 },   // Name
      2: { cellWidth: 25 },   // Type
      3: { cellWidth: 25 },   // Plan
      4: { cellWidth: 20 },   // Amount
      5: { cellWidth: 20 },   // Method
      6: { cellWidth: 25 },   // Staff
      7: { cellWidth: 37 },   // Date
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 10, right: 10 },
  });

  addPDFFooter(doc);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `subscription_transactions_${timestamp}.pdf`;
  doc.save(filename);
  
  return filename;
};
/**
 * Generate Prepaid Transactions PDF Report
 */
export const generatePrepaidTransactionsPDF = (transactionsData, filterInfo = {}) => {
  console.log("🔍 generatePrepaidTransactionsPDF received:", { transactionsData, filterInfo });
  
  const doc = new jsPDF({ orientation: 'portrait' });

  // Report title
  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Prepaid Transactions Report`
    : 'Prepaid Transactions Report';

  const gymDetails = filterInfo.owner_name 
    ? `Admin: ${filterInfo.owner_name}` 
    : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;

  // Date range and filters
  if (filterInfo.start_date || filterInfo.end_date || filterInfo.filter_type || filterInfo.filter_method || filterInfo.search_term) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    
    const filters = [];
    if (filterInfo.start_date && filterInfo.end_date) {
      filters.push(`Period: ${filterInfo.start_date} to ${filterInfo.end_date}`);
    }
    if (filterInfo.filter_type) filters.push(`Type: ${filterInfo.filter_type}`);
    if (filterInfo.filter_method) filters.push(`Method: ${filterInfo.filter_method}`);
    if (filterInfo.search_term) filters.push(`Search: "${filterInfo.search_term}"`);

    doc.text(filters.join(' | '), 14, yPosition);
    yPosition += 5;
  }

  // Summary statistics in one row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);

  const colPositions = [14, 65, 110, 155];
  doc.text(`Total Revenue: ${transactionsData.total_revenue.toFixed(2)}`, colPositions[0], yPosition);
  doc.text(`Transactions: ${transactionsData.total_transactions}`, colPositions[1], yPosition);
  doc.text(`Cash: ${transactionsData.cash_revenue.toFixed(2)}`, colPositions[2], yPosition);
  doc.text(`Cashless: ${transactionsData.cashless_revenue.toFixed(2)}`, colPositions[3], yPosition);
  yPosition += 8;

  // Table data with mapped types
  const mapTransactionType = (type) => {
    if (type === 'tapup') return 'Tap-Up';
    if (type === 'new_membership') return 'New Membership';
    if (type === 'product_purchase') return 'Product';
    return type || 'N/A';
  };

  const tableData = transactionsData.transactions.map((txn, index) => [
    index + 1,
    txn.member_name || 'N/A',
    mapTransactionType(txn.transaction_type),
    txn.plan_name || 'N/A',
    parseFloat(txn.amount || 0).toFixed(2),
    txn.payment_method || 'N/A',
    txn.staff_name || 'N/A',
    txn.transaction_date 
      ? new Date(txn.transaction_date).toLocaleString('en-US', {
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
    head: [['#', 'Member Name', 'Type', 'Plan', 'Amount', 'Method', 'Staff', 'Transaction Date']],
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
      1: { cellWidth: 30 },   // Name
      2: { cellWidth: 25 },   // Type
      3: { cellWidth: 25 },   // Plan
      4: { cellWidth: 20 },   // Amount
      5: { cellWidth: 20 },   // Method
      6: { cellWidth: 25 },   // Staff
      7: { cellWidth: 37 },   // Date
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 10, right: 10 },
  });

  addPDFFooter(doc);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `prepaid_transactions_${timestamp}.pdf`;
  doc.save(filename);
  
  return filename;
};
