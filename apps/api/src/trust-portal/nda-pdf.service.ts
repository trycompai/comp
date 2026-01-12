import { Injectable, Logger } from '@nestjs/common';
import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
  EncryptedPDFError,
} from 'pdf-lib';
import { AttachmentsService } from '../attachments/attachments.service';

@Injectable()
export class NdaPdfService {
  private readonly logger = new Logger(NdaPdfService.name);

  constructor(private readonly attachmentsService: AttachmentsService) {}

  async generateNdaPdf(params: {
    organizationName: string;
    signerName: string;
    signerEmail: string;
    agreementId: string;
  }): Promise<Buffer> {
    const { organizationName, signerName, signerEmail, agreementId } = params;

    const pdfDoc = await PDFDocument.create();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    const margin = 50;
    let yPosition = height - margin;

    page.drawText('NON-DISCLOSURE AGREEMENT', {
      x: margin,
      y: yPosition,
      size: 18,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 40;

    page.drawText(`Organization: ${organizationName}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: helvetica,
    });

    yPosition -= 20;

    const now = new Date();
    page.drawText(`Date: ${now.toLocaleDateString('en-US')}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: helvetica,
    });

    yPosition -= 40;

    const ndaText = `This Non-Disclosure Agreement ("Agreement") is entered into on ${now.toLocaleDateString('en-US')} between ${organizationName} ("Disclosing Party") and ${signerName} ("Receiving Party").

1. CONFIDENTIAL INFORMATION
The Receiving Party acknowledges that they will receive access to confidential compliance documentation and policy materials.

2. OBLIGATIONS
The Receiving Party agrees to:
   a) Maintain all confidential information in strict confidence
   b) Not disclose confidential information to any third party without prior written consent
   c) Use confidential information solely for evaluation purposes
   d) Return or destroy all confidential materials upon request

3. TERM
This Agreement shall remain in effect for a period of two (2) years from the date of execution.

4. REMEDIES
The Receiving Party acknowledges that unauthorized disclosure may cause irreparable harm.

By signing below, the Receiving Party agrees to be bound by the terms of this Agreement.`;

    const lines = this.wrapText(ndaText, width - 2 * margin, helvetica, 11);
    for (const line of lines) {
      if (yPosition < margin + 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = newPage.getSize().height - margin;
      }
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 11,
        font: helvetica,
      });
      yPosition -= 15;
    }

    yPosition -= 40;

    page.drawText('RECEIVING PARTY:', {
      x: margin,
      y: yPosition,
      size: 12,
      font: helveticaBold,
    });

    yPosition -= 30;

    page.drawText(`Name: ${signerName}`, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helvetica,
    });

    yPosition -= 20;

    page.drawText(`Email: ${signerEmail}`, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helvetica,
    });

    yPosition -= 20;

    page.drawText(`Signed: ${now.toLocaleString('en-US')}`, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helvetica,
    });

    await this.addWatermark(pdfDoc, signerName, signerEmail, agreementId);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async addWatermark(
    pdfDoc: PDFDocument,
    name: string,
    email: string,
    agreementId: string,
    customWatermarkText?: string,
  ) {
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    const watermarkText = 'CompAI';
    const requestedByText = `Requested by: ${email}`;
    const fontSize = 48;
    const subTextSize = 12;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const pageNumber = pages.indexOf(page) + 1;

      // Create a repeating diagonal watermark pattern with alternating angles
      const horizontalSpacing = 250; // Space between watermarks horizontally
      const verticalSpacing = 180; // Space between watermarks vertically
      
      // Calculate how many watermarks we need to cover the page
      const numRows = Math.ceil(height / verticalSpacing) + 2;
      const numCols = Math.ceil(width / horizontalSpacing) + 2;

      for (let row = -1; row < numRows; row++) {
        for (let col = -1; col < numCols; col++) {
          // Create a checkerboard-like offset pattern
          const offsetX = (row % 2) * (horizontalSpacing / 2);
          const x = col * horizontalSpacing + offsetX;
          const y = row * verticalSpacing;
          
          // Alternate between -45 and -35 degrees for visual interest
          const angle = (row + col) % 2 === 0 ? -45 : -35;

          // Main "CompAI" watermark
          page.drawText(watermarkText, {
            x,
            y,
            size: fontSize,
            font: fontBold,
            color: rgb(0.85, 0.85, 0.85), // Darker gray
            opacity: 0.10, // Increased opacity for better visibility
            rotate: degrees(angle),
          });

          // "Requested by: [email]" text below CompAI
          page.drawText(requestedByText, {
            x: x - 10,
            y: y - 18,
            size: subTextSize,
            font: fontRegular,
            color: rgb(0.85, 0.85, 0.85), // Darker gray
            opacity: 0.10, // Slightly darker and more visible
            rotate: degrees(angle),
          });
        }
      }

      // Add small footer with page number and document ID
      const footerFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const footerText = `Page ${pageNumber} of ${pages.length}  •  Document ID: ${agreementId.split('-').pop()?.slice(0, 8)}`;
      
      page.drawText(footerText, {
        x: width / 2 - footerFont.widthOfTextAtSize(footerText, 8) / 2,
        y: 15,
        size: 8,
        font: footerFont,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
  }

  private wrapText(
    text: string,
    maxWidth: number,
    font: any,
    fontSize: number,
  ): string[] {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push('');
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  async uploadNdaPdf(
    organizationId: string,
    agreementId: string,
    pdfBuffer: Buffer,
  ): Promise<string> {
    const fileName = `nda-${agreementId}-${Date.now()}.pdf`;

    const s3Key = await this.attachmentsService.uploadToS3(
      pdfBuffer,
      fileName,
      'application/pdf',
      organizationId,
      'trust_nda',
      agreementId,
    );

    return s3Key;
  }

  async getSignedUrl(s3Key: string): Promise<string> {
    return this.attachmentsService.getPresignedDownloadUrl(s3Key);
  }

  async watermarkExistingPdf(
    pdfBuffer: Buffer,
    params: {
      name: string;
      email: string;
      docId: string;
      watermarkText?: string;
    },
  ): Promise<Buffer> {
    const { name, email, docId, watermarkText } = params;

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBuffer);
    } catch (error) {
      // Check for encrypted PDF error - use name/message check as instanceof can fail across module boundaries
      const isEncryptedError =
        error instanceof EncryptedPDFError ||
        (error instanceof Error &&
          (error.name === 'EncryptedPDFError' ||
            error.message.includes('is encrypted')));

      if (isEncryptedError) {
        // Encrypted PDF - return as-is without watermark
        // User already signed NDA for accountability, encrypted PDFs require password anyway
        this.logger.debug(
          `Skipping watermark for PDF ${docId} - file is encrypted`,
        );
        return pdfBuffer;
      }
      // Re-throw other parsing errors
      throw error;
    }

    await this.addWatermark(pdfDoc, name, email, docId, watermarkText);
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
