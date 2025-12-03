import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
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
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const timestamp = new Date().toISOString();
    const watermarkText =
      customWatermarkText ||
      `For: ${name} <${email}> | ${timestamp} | ID: ${agreementId}`;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, 10);

      page.drawText(watermarkText, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: 10,
        font,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.3,
        rotate: degrees(-45),
      });

      page.drawText(`Document ID: ${agreementId}`, {
        x: 50,
        y: 20,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
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
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    await this.addWatermark(pdfDoc, name, email, docId, watermarkText);
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
