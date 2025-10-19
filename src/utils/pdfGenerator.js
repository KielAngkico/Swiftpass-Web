import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/Final_SwiftPass_Logo.jpg';

export const COMPANY_INFO = {
  name: 'SwiftPass',
  logo: logo,
  address: 'Quezon City',
  phone: '09970821181',
  email: 'SwiftpassTech@gmail.com',
};

export const addPDFHeader = (doc, reportTitle, gymDetails = null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const logoX = 14;
  const logoY = 14;
  const logoWidth = 22;
  const logoHeight = 22;

  try {
    doc.addImage(COMPANY_INFO.logo, 'JPEG', logoX, logoY, logoWidth, logoHeight);
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.rect(logoX - 1, logoY - 1, logoWidth + 2, logoHeight + 2);
  } catch (error) {
    console.warn('Logo not found or failed to load:', error);
  }

  const infoX = logoX + logoWidth + 4;
  const infoY = logoY + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.text(COMPANY_INFO.name, infoX, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  const lineHeight = 4;
  doc.text(COMPANY_INFO.address, infoX, infoY + lineHeight * 1);
  doc.text(`Contact: ${COMPANY_INFO.phone}`, infoX, infoY + lineHeight * 2);
  doc.text(`Email: ${COMPANY_INFO.email}`, infoX, infoY + lineHeight * 3);
  doc.text(`Issued: ${currentDate}`, infoX, infoY + lineHeight * 4);

  const titleY = logoY + logoHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text(reportTitle, pageWidth / 2, titleY, { align: 'center' });

  if (gymDetails) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(gymDetails, pageWidth / 2, titleY + 6, { align: 'center' });
  }

  const lineY = gymDetails ? titleY + 10 : titleY + 4;
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(14, lineY, pageWidth - 14, lineY);
};


export const addPDFFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
};

export const updateCompanyInfo = (newInfo) => {
  Object.assign(COMPANY_INFO, newInfo);
};
