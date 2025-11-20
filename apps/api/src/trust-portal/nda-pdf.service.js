"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NdaPdfService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NdaPdfService = void 0;
const common_1 = require("@nestjs/common");
const pdf_lib_1 = require("pdf-lib");
const attachments_service_1 = require("../attachments/attachments.service");
let NdaPdfService = NdaPdfService_1 = class NdaPdfService {
    attachmentsService;
    logger = new common_1.Logger(NdaPdfService_1.name);
    constructor(attachmentsService) {
        this.attachmentsService = attachmentsService;
    }
    async generateNdaPdf(params) {
        const { organizationName, signerName, signerEmail, agreementId } = params;
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const helveticaBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const helvetica = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();
        const margin = 50;
        let yPosition = height - margin;
        page.drawText('NON-DISCLOSURE AGREEMENT', {
            x: margin,
            y: yPosition,
            size: 18,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(0, 0, 0),
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
    async addWatermark(pdfDoc, name, email, agreementId) {
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();
        const timestamp = new Date().toISOString();
        const watermarkText = `For: ${name} <${email}> | ${timestamp} | ID: ${agreementId}`;
        for (const page of pages) {
            const { width, height } = page.getSize();
            const textWidth = font.widthOfTextAtSize(watermarkText, 10);
            page.drawText(watermarkText, {
                x: width / 2 - textWidth / 2,
                y: height / 2,
                size: 10,
                font,
                color: (0, pdf_lib_1.rgb)(0.8, 0.8, 0.8),
                opacity: 0.3,
                rotate: (0, pdf_lib_1.degrees)(-45),
            });
            page.drawText(`Document ID: ${agreementId}`, {
                x: 50,
                y: 20,
                size: 8,
                font,
                color: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5),
            });
        }
    }
    wrapText(text, maxWidth, font, fontSize) {
        const paragraphs = text.split('\n');
        const lines = [];
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
                }
                else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                lines.push(currentLine);
            }
        }
        return lines;
    }
    async uploadNdaPdf(organizationId, agreementId, pdfBuffer) {
        const fileName = `nda-${agreementId}-${Date.now()}.pdf`;
        const s3Key = await this.attachmentsService.uploadToS3(pdfBuffer, fileName, 'application/pdf', organizationId, 'trust_nda', agreementId);
        return s3Key;
    }
    async getSignedUrl(s3Key) {
        return this.attachmentsService.getPresignedDownloadUrl(s3Key);
    }
    async watermarkExistingPdf(pdfBuffer, params) {
        const { name, email, docId } = params;
        const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
        await this.addWatermark(pdfDoc, name, email, docId);
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }
};
exports.NdaPdfService = NdaPdfService;
exports.NdaPdfService = NdaPdfService = NdaPdfService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService])
], NdaPdfService);
//# sourceMappingURL=nda-pdf.service.js.map