import { jsPDF } from 'jspdf';
import { addPDFHeader, addPDFFooter } from './pdfGenerator';


export const generateAnalyticsPDF = async (analyticsData, filterInfo = {}) => {
  console.log("🔍 generateAnalyticsPDF received:", { analyticsData, filterInfo });
  
  const doc = new jsPDF({ orientation: 'portrait' });
  
  
  const reportTitle = filterInfo.gym_name
    ? `${filterInfo.gym_name} - Analytics Report`
    : 'Analytics Dashboard Report';

  const gymDetails = filterInfo.owner_name 
    ? `Admin: ${filterInfo.owner_name}` 
    : null;

  addPDFHeader(doc, reportTitle, gymDetails);

  const headerEndY = 12 + 22 + 20;
  let yPosition = headerEndY + 6;

  if (filterInfo.filter_type) {
    doc.setFontSize(8);
    doc.setTextColor(100);
    let filterText = `Filter: ${filterInfo.filter_type.charAt(0).toUpperCase() + filterInfo.filter_type.slice(1)}`;
    if (filterInfo.filter_type === 'custom' && filterInfo.start_date && filterInfo.end_date) {
      filterText += ` (${filterInfo.start_date} to ${filterInfo.end_date})`;
    }
    doc.text(filterText, 14, yPosition);
    yPosition += 8;
  }


  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('KEY PERFORMANCE INDICATORS', 14, yPosition);
  yPosition += 8;

  
  const kpis = [
    { label: 'Total Revenue', value: `₱${(analyticsData.summary?.totalRevenue || 0).toLocaleString()}`, color: [16, 185, 129] },
    { label: 'Members Inside', value: analyticsData.summary?.membersInside || 0, color: [99, 102, 241] },
    { label: 'Day Pass Inside', value: analyticsData.summary?.dayPassInside || 0, color: [245, 158, 11] },
    { label: 'Total Transactions', value: analyticsData.summary?.totalTransactions || 0, color: [139, 92, 246] },
    { label: 'Peak Hour', value: analyticsData.summary?.peakHour || '—', color: [75, 85, 99] },
  ];

  const boxWidth = 55;
  const boxHeight = 22;
  const boxSpacing = 5;
  const cols = 3;
  
  kpis.forEach((kpi, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = 14 + col * (boxWidth + boxSpacing);
    const y = yPosition + row * (boxHeight + boxSpacing);

    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');
    
    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2);
    

    doc.setFillColor(...kpi.color);
    doc.roundedRect(x, y, boxWidth, 3, 2, 2, 'F');


    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x + 3, y + 10);

   
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const valueStr = String(kpi.value);
    doc.text(valueStr, x + 3, y + 17);
  });

  yPosition += Math.ceil(kpis.length / cols) * (boxHeight + boxSpacing) + 10;

  if (analyticsData.topMembers && analyticsData.topMembers.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('TOP 3 MOST ACTIVE MEMBERS', 14, yPosition);
    yPosition += 8;

    const topMembers = analyticsData.topMembers.slice(0, 3);
    const memberCardWidth = 55;
    const memberCardHeight = 28;
    const medals = ['1st', '2nd', '3rd'];
    const cardColors = [
      [255, 243, 205], // Gold
      [229, 231, 235], // Silver
      [255, 237, 213]  // Bronze
    ];

    topMembers.forEach((member, index) => {
      const x = 14 + index * (memberCardWidth + boxSpacing);
      const y = yPosition;


      doc.setFillColor(...cardColors[index]);
      doc.roundedRect(x, y, memberCardWidth, memberCardHeight, 2, 2, 'F');
      
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, memberCardWidth, memberCardHeight, 2, 2);

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      const medal = medals[index];
      const medalWidth = doc.getTextWidth(medal);
      doc.text(medal, x + (memberCardWidth - medalWidth) / 2, y + 8);

   
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      const name = (member.name || 'N/A').substring(0, 15);
      const nameWidth = doc.getTextWidth(name);
      doc.text(name, x + (memberCardWidth - nameWidth) / 2, y + 15);

   
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      const visits = `${member.visitCount || 0} visits`;
      const visitsWidth = doc.getTextWidth(visits);
      doc.text(visits, x + (memberCardWidth - visitsWidth) / 2, y + 20);

   
      doc.setFontSize(6);
      const rfid = (member.rfidTag || 'N/A').substring(0, 12);
      const rfidWidth = doc.getTextWidth(rfid);
      doc.text(rfid, x + (memberCardWidth - rfidWidth) / 2, y + 24);
    });

    yPosition += memberCardHeight + 10;
  }


  doc.addPage();
  yPosition = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TRANSACTION TYPE BREAKDOWN', 14, yPosition);
  doc.text('REVENUE BREAKDOWN', 110, yPosition);
  yPosition += 5;

  const transactionChart = await captureChartAsImage('transactionTypeChart');
  const revenueChart = await captureChartAsImage('revenueChart');

  if (transactionChart) {
    doc.addImage(transactionChart, 'PNG', 14, yPosition, 80, 80);
  }

  if (revenueChart) {
    doc.addImage(revenueChart, 'PNG', 110, yPosition, 80, 80);
  }

  yPosition += 90;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('REVENUE BY MEMBERSHIP TYPE', 14, yPosition);
  yPosition += 5;

  const membershipChart = await captureChartAsImage('membershipTypeChart');
  if (membershipChart) {
    doc.addImage(membershipChart, 'PNG', 14, yPosition, 180, 70);
    yPosition += 75;
  }

  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PEAK HOUR ANALYSIS (24 Hours)', 14, yPosition);
  yPosition += 5;

  const peakHourChart = await captureChartAsImage('peakHourChart');
  if (peakHourChart) {
    doc.addImage(peakHourChart, 'PNG', 14, yPosition, 180, 70);
    yPosition += 75;
  }

  if (analyticsData.currentlyInside && analyticsData.currentlyInside.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`CURRENTLY INSIDE (${analyticsData.currentlyInside.length})`, 14, yPosition);
    yPosition += 8;

    const cardWidth = 58;
    const cardHeight = 18;
    const cardsPerRow = 3;
    const cardSpacing = 5;

    analyticsData.currentlyInside.slice(0, 15).forEach((member, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = 14 + col * (cardWidth + cardSpacing);
      const y = yPosition + row * (cardHeight + cardSpacing);

      if (y + cardHeight > 280) {
        doc.addPage();
        yPosition = 20;
        return;
      }

      const isMember = member.visitorType === 'Member';
      const cardColor = isMember ? [219, 234, 254] : [254, 243, 199]; 
      
      doc.setFillColor(...cardColor);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isMember ? 37 : 146, isMember ? 99 : 64, isMember ? 235 : 0);
      doc.text(member.visitorType || 'Member', x + 2, y + 4);

      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      const name = (member.name || 'N/A').substring(0, 18);
      doc.text(name, x + 2, y + 9);

      doc.setFontSize(6);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text((member.rfidTag || 'N/A').substring(0, 15), x + 2, y + 13);

      const entryTime = member.entryTime 
        ? new Date(member.entryTime).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '—';
      doc.text(entryTime, x + 2, y + 16);
    });
  }

  addPDFFooter(doc);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filterSuffix = filterInfo.filter_type ? `_${filterInfo.filter_type}` : '';
  const filename = `analytics_report${filterSuffix}_${timestamp}.pdf`;
  doc.save(filename);
  
  return filename;
};

/**
 * Helper function to capture a chart canvas as an image
 */
async function captureChartAsImage(chartId) {
  return new Promise((resolve) => {
    try {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        console.warn(`Chart with id "${chartId}" not found`);
        resolve(null);
        return;
      }

      const canvas = chartElement.querySelector('canvas');
      if (!canvas) {
        console.warn(`Canvas not found in chart "${chartId}"`);
        resolve(null);
        return;
      }

      const imageData = canvas.toDataURL('image/png');
      resolve(imageData);
    } catch (error) {
      console.error(`Error capturing chart "${chartId}":`, error);
      resolve(null);
    }
  });
}
