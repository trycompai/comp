import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';

// Primary brand color (teal/green) - hsl(165, 100%, 15%)
const PRIMARY_COLOR = { r: 0, g: 77, b: 61 };

const COMP_AI_LOGO_URL = 'https://assets.trycomp.ai/logo.png';

const getLogoDataUrl = async (): Promise<string | null> => {
  try {
    const response = await fetch(COMP_AI_LOGO_URL);
    if (!response.ok) {
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
};

@Injectable()
export class TrainingCertificatePdfService {
  /**
   * Clean text for PDF rendering by handling unicode characters
   */
  private cleanTextForPDF(text: string): string {
    const strippedText = text
      .replace(/\u00AD/g, '')
      .replace(/[\u200B-\u200F]/g, '')
      .replace(/[\u202A-\u202E]/g, '')
      .replace(/[\u2060-\u206F]/g, '')
      .replace(/\uFEFF/g, '')
      .replace(/\uFFFD/g, '');

    const replacements: { [key: string]: string } = {
      '\u2018': "'",
      '\u2019': "'",
      '\u201C': '"',
      '\u201D': '"',
      '\u2013': '-',
      '\u2014': '-',
      '\u2026': '...',
      '\u00A0': ' ',
    };

    let cleanedText = strippedText;
    for (const [unicode, replacement] of Object.entries(replacements)) {
      cleanedText = cleanedText.replace(new RegExp(unicode, 'g'), replacement);
    }

    return cleanedText;
  }

  /**
   * Generates a training completion certificate PDF with Comp AI branding
   */
  async generateTrainingCertificatePdf(params: {
    userName: string;
    organizationName: string;
    completedAt: Date;
  }): Promise<Buffer> {
    const { userName, organizationName, completedAt } = params;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background - light cream/off-white
    doc.setFillColor(252, 251, 248);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative border using primary color
    doc.setDrawColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.setLineWidth(2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

    // Inner decorative border
    doc.setLineWidth(0.5);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30, 'S');

    // Add Comp AI logo at top center
    const logoDataUrl = await getLogoDataUrl();
    if (logoDataUrl) {
      const logoWidth = 15;
      const logoHeight = 15;
      doc.addImage(
        logoDataUrl,
        'PNG',
        pageWidth / 2 - logoWidth / 2,
        22,
        logoWidth,
        logoHeight,
      );
    }

    // Certificate header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 48, {
      align: 'center',
    });

    // Main title in black
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(18, 18, 18);
    doc.text('Security Awareness Training', pageWidth / 2, 62, {
      align: 'center',
    });

    // Decorative line with primary color
    doc.setDrawColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - 50, 68, pageWidth / 2 + 50, 68);

    // "This certifies that" text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('This is to certify that', pageWidth / 2, 82, { align: 'center' });

    // Employee name
    const cleanUserName = this.cleanTextForPDF(userName);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(18, 18, 18);
    doc.text(cleanUserName, pageWidth / 2, 95, { align: 'center' });

    // Underline for name with primary color
    const nameWidth = doc.getTextWidth(cleanUserName);
    doc.setDrawColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.setLineWidth(0.4);
    doc.line(
      pageWidth / 2 - nameWidth / 2 - 10,
      98,
      pageWidth / 2 + nameWidth / 2 + 10,
      98,
    );

    // Description
    const cleanOrgName = this.cleanTextForPDF(organizationName);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(
      'has successfully completed all modules of the',
      pageWidth / 2,
      110,
      {
        align: 'center',
      },
    );
    doc.text('Security Awareness Training program', pageWidth / 2, 117, {
      align: 'center',
    });
    // "for" in normal, org name in bold - manually center
    doc.setFont('helvetica', 'normal');
    const forText = 'for ';
    const forWidth = doc.getTextWidth(forText);
    doc.setFont('helvetica', 'bold');
    const orgWidth = doc.getTextWidth(cleanOrgName);
    const totalWidth = forWidth + orgWidth;
    const startX = pageWidth / 2 - totalWidth / 2;
    
    doc.setFont('helvetica', 'normal');
    doc.text(forText, startX, 124);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 18);
    doc.text(cleanOrgName, startX + forWidth, 124);
    doc.setFont('helvetica', 'normal');

    // Completion date with primary color
    const formattedDate = new Date(completedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(18, 18, 18);
    doc.text(`Completed on ${formattedDate}`, pageWidth / 2, 140, {
      align: 'center',
    });

    // Certified by section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('Certified by', pageWidth / 2, 158, { align: 'center' });

    // Comp AI branding with logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(18, 18, 18);
    const compAiText = 'Comp AI';
    const compAiTextWidth = doc.getTextWidth(compAiText);
    const logoSize = 8;
    const gap = 3;
    const totalBrandWidth = logoSize + gap + compAiTextWidth;
    const brandStartX = pageWidth / 2 - totalBrandWidth / 2;
    
    // Add small logo next to text
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', brandStartX, 164, logoSize, logoSize);
    }
    doc.text(compAiText, brandStartX + logoSize + gap, 171);

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('AI-powered compliance platform', pageWidth / 2, 178, {
      align: 'center',
    });
    doc.text('https://trycomp.ai', pageWidth / 2, 183, { align: 'center' });

    // Get the PDF as a buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }
}
