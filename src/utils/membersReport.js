import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFHeader, addPDFFooter } from './pdfGenerator';

export const generatePrepaidMembersPDF = (members, filterInfo = {}) => {
  const doc = new jsPDF({ orientation: 'portrait' });

  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Members Directory`
    : 'Members Directory';

  const gymDetails = filterInfo.owner_name ? `Admin: ${filterInfo.owner_name}` : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;

  if (filterInfo.status && filterInfo.status !== 'All') {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Filter: ${filterInfo.status} members only`, 14, yPosition);
    yPosition += 5;
  }

  if (filterInfo.search) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Search: "${filterInfo.search}"`, 14, yPosition);
    yPosition += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Total Members: ${members.length}`, 14, yPosition);
  yPosition += 3;

  const tableData = members.map((member, index) => [
    index + 1,
    member.full_name || 'N/A',
    member.rfid_tag || 'N/A',
    member.gender === 'male' ? 'M' : member.gender === 'female' ? 'F' : 'O',
    member.age || 'N/A',
    member.phone_number || 'N/A',
    member.email || 'N/A',
    member.address || 'N/A',
    member.staff_name || 'N/A',
    member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A',
  ]);

  autoTable(doc, {
    startY: yPosition + 5,
    head: [['#', 'Full Name', 'RFID', 'Sex', 'Age', 'Phone', 'Email', 'Address', 'Registered By', 'Joined At']],
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
      0: { cellWidth: 8 },   // #
      1: { cellWidth: 24 },  // Full Name
      2: { cellWidth: 17 },  // RFID
      3: { cellWidth: 9 },   // Sex
      4: { cellWidth: 9 },   // Age
      5: { cellWidth: 20 },  // Phone
      6: { cellWidth: 27 },  // Email
      7: { cellWidth: 30 },  // Address
      8: { cellWidth: 28 },  // Registered By
      9: { cellWidth: 17 },  // Joined At
    },
    margin: { left: 10, right: 10 },
  });

  addPDFFooter(doc);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `prepaid_members_directory_${timestamp}.pdf`;
  doc.save(filename);
};

export const generateSubscriptionMembersPDF = (members, filterInfo = {}) => {
  const doc = new jsPDF({ orientation: 'portrait' });

  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Members Directory`
    : 'Members Directory';

  const gymDetails = filterInfo.owner_name ? `Admin: ${filterInfo.owner_name}` : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;

  if (filterInfo.status && filterInfo.status !== 'All') {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Filter: ${filterInfo.status} members only`, 14, yPosition);
    yPosition += 5;
  }

  if (filterInfo.search) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Search: "${filterInfo.search}"`, 14, yPosition);
    yPosition += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Total Members: ${members.length}`, 14, yPosition);
  yPosition += 3;

  const tableData = members.map((member, index) => [
    index + 1,
    member.full_name || 'N/A',
    member.rfid_tag || 'N/A',
    member.gender === 'male' ? 'M' : member.gender === 'female' ? 'F' : 'O',
    member.age || 'N/A',
    member.phone_number || 'N/A',
    member.email || 'N/A',
    member.address || 'N/A',
    member.staff_name || 'N/A',
    member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A',
  ]);

  autoTable(doc, {
    startY: yPosition + 5,
    head: [['#', 'Full Name', 'RFID', 'Sex', 'Age', 'Phone', 'Email', 'Address', 'Registered By', 'Joined At']],
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
      0: { cellWidth: 8 },
      1: { cellWidth: 24 },
      2: { cellWidth: 17 },
      3: { cellWidth: 9 },
      4: { cellWidth: 9 },
      5: { cellWidth: 20 },
      6: { cellWidth: 27 },
      7: { cellWidth: 30 },
      8: { cellWidth: 28 },
      9: { cellWidth: 17 },
    },
    margin: { left: 10, right: 10 },
  });

  addPDFFooter(doc);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `subscription_members_directory_${timestamp}.pdf`;
  doc.save(filename);
};
