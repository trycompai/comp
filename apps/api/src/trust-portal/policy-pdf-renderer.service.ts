import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';

interface JSONContent {
  type: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  text?: string;
  marks?: Array<{ type: string }>;
}

interface PDFConfig {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  lineHeight: number;
  defaultFontSize: number;
  yPosition: number;
}

interface PolicyForPDF {
  name: string;
  content: any;
}

@Injectable()
export class PolicyPdfRendererService {
  /**
   * Convert hex color to RGB values (0-255 range for jsPDF)
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }

  /**
   * Get accent color from organization or use default
   */
  private getAccentColor(primaryColor: string | null | undefined): { r: number; g: number; b: number } {
    // Default project primary color: dark teal/green (hsl(165, 100%, 15%) = #004D3D)
    const defaultColor = { r: 0, g: 77, b: 61 };
    
    if (!primaryColor) {
      return defaultColor;
    }
    
    try {
      return this.hexToRgb(primaryColor);
    } catch (error) {
      console.warn('Invalid primary color format, using default:', error);
      return defaultColor;
    }
  }

  private cleanTextForPDF(text: string): string {
    // Strip invisible/control-ish unicode chars that commonly appear via copy/paste.
    // These aren't visible in the editor, but previous logic converted unknown unicode to
    // "?" which looks like random corruption in the generated PDF.
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
      '\u2265': '>=',
      '\u2264': '<=',
      '\u00B0': 'deg',
      '\u00A9': '(c)',
      '\u00AE': '(R)',
      '\u2122': 'TM',
      '\u00A0': ' ',
      '\u2022': '•',
      '\u00B1': '+/-',
      '\u00D7': 'x',
      '\u00F7': '/',
      '\u2192': '->',
      '\u2190': '<-',
      '\u2194': '<->',
    };

    let cleanedText = strippedText;
    for (const [unicode, replacement] of Object.entries(replacements)) {
      cleanedText = cleanedText.replace(new RegExp(unicode, 'g'), replacement);
    }

    return cleanedText.replace(/[^\x00-\x7F]/g, (char) => {
      const safeChars =
        /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß]/;
      if (safeChars.test(char)) {
        return char;
      }
      const fallbacks: { [key: string]: string } = {
        à: 'a',
        á: 'a',
        â: 'a',
        ã: 'a',
        ä: 'a',
        å: 'a',
        æ: 'ae',
        è: 'e',
        é: 'e',
        ê: 'e',
        ë: 'e',
        ì: 'i',
        í: 'i',
        î: 'i',
        ï: 'i',
        ò: 'o',
        ó: 'o',
        ô: 'o',
        õ: 'o',
        ö: 'o',
        ø: 'o',
        ù: 'u',
        ú: 'u',
        û: 'u',
        ü: 'u',
        ñ: 'n',
        ç: 'c',
        ß: 'ss',
        ÿ: 'y',
        À: 'A',
        Á: 'A',
        Â: 'A',
        Ã: 'A',
        Ä: 'A',
        Å: 'A',
        Æ: 'AE',
        È: 'E',
        É: 'E',
        Ê: 'E',
        Ë: 'E',
        Ì: 'I',
        Í: 'I',
        Î: 'I',
        Ï: 'I',
        Ò: 'O',
        Ó: 'O',
        Ô: 'O',
        Õ: 'O',
        Ö: 'O',
        Ø: 'O',
        Ù: 'U',
        Ú: 'U',
        Û: 'U',
        Ü: 'U',
        Ñ: 'N',
        Ç: 'C',
        Ý: 'Y',
      };
      // Preserve unknown characters instead of coercing to "?".
      // If a glyph isn't supported by the active PDF font, viewers may show a tofu box,
      // but inserting "?" is worse because it looks like text was modified.
      return fallbacks[char] ?? char;
    });
  }

  private convertToInternalFormat(content: any[]): JSONContent[] {
    return content.map((item) => ({
      type: item.type || 'paragraph',
      attrs: item.attrs,
      content: item.content
        ? this.convertToInternalFormat(item.content)
        : undefined,
      text: item.text,
      marks: item.marks,
    }));
  }

  private extractTextFromContent(content: JSONContent[]): string {
    let text = '';
    for (const node of content) {
      if (node.text) {
        text += node.text;
      }
      if (node.content) {
        text += this.extractTextFromContent(node.content);
      }
    }
    return text;
  }

  private checkPageBreak(config: PDFConfig, requiredSpace: number = 20): void {
    if (config.yPosition + requiredSpace > config.pageHeight - config.margin) {
      config.doc.addPage();
      config.yPosition = config.margin;
    }
  }

  private renderFormattedContent(
    config: PDFConfig,
    text: string,
    marks?: Array<{ type: string }>,
  ): void {
    const cleanText = this.cleanTextForPDF(text);
    const isBold = marks?.some((mark) => mark.type === 'bold');
    const isItalic = marks?.some((mark) => mark.type === 'italic');

    let fontStyle = 'normal';
    if (isBold && isItalic) fontStyle = 'bolditalic';
    else if (isBold) fontStyle = 'bold';
    else if (isItalic) fontStyle = 'italic';

    config.doc.setFont('helvetica', fontStyle);
    const lines = config.doc.splitTextToSize(cleanText, config.contentWidth);

    for (const line of lines) {
      this.checkPageBreak(config);
      config.doc.text(line, config.margin, config.yPosition);
      config.yPosition += config.lineHeight;
    }

    config.doc.setFont('helvetica', 'normal');
  }

  private processContent(config: PDFConfig, content: JSONContent[]): void {
    for (const node of content) {
      switch (node.type) {
        case 'heading':
          this.checkPageBreak(config, 30);
          const level = node.attrs?.level || 1;
          const headingSizes: { [key: number]: number } = {
            1: 16,
            2: 14,
            3: 12,
            4: 11,
            5: 10,
            6: 10,
          };
          config.doc.setFontSize(headingSizes[level]);
          config.doc.setFont('helvetica', 'bold');
          config.doc.setTextColor(0, 0, 0);

          if (node.content) {
            const headingText = this.cleanTextForPDF(
              this.extractTextFromContent(node.content),
            );
            const lines = config.doc.splitTextToSize(
              headingText,
              config.contentWidth,
            );
            for (const line of lines) {
              this.checkPageBreak(config);
              config.doc.text(line, config.margin, config.yPosition);
              config.yPosition += config.lineHeight * 1.2;
            }
          }

          config.doc.setFontSize(config.defaultFontSize);
          config.doc.setFont('helvetica', 'normal');
          config.yPosition += config.lineHeight;
          break;

        case 'paragraph':
          this.checkPageBreak(config);
          if (node.content) {
            for (const inline of node.content) {
              if (inline.type === 'text' && inline.text) {
                this.renderFormattedContent(config, inline.text, inline.marks);
              } else if (inline.content) {
                this.processContent(config, [inline]);
              }
            }
          }
          config.yPosition += config.lineHeight * 0.5;
          break;

        case 'bulletList':
        case 'orderedList':
          if (node.content) {
            node.content.forEach((item, index) => {
              if (item.type === 'listItem' && item.content) {
                this.checkPageBreak(config);
                const bullet =
                  node.type === 'bulletList' ? '•' : `${index + 1}.`;
                const itemText = this.cleanTextForPDF(
                  this.extractTextFromContent(item.content),
                );
                const lines = config.doc.splitTextToSize(
                  itemText,
                  config.contentWidth - 10,
                );

                config.doc.text(bullet, config.margin, config.yPosition);

                for (let i = 0; i < lines.length; i++) {
                  this.checkPageBreak(config);
                  config.doc.text(
                    lines[i],
                    config.margin + 10,
                    config.yPosition,
                  );
                  config.yPosition += config.lineHeight;
                }

                if (
                  item.content.some(
                    (n) => n.type === 'bulletList' || n.type === 'orderedList',
                  )
                ) {
                  const nestedLists = item.content.filter(
                    (n) => n.type === 'bulletList' || n.type === 'orderedList',
                  );
                  this.processContent(config, nestedLists);
                }
              }
            });
          }
          config.yPosition += config.lineHeight;
          break;

        case 'codeBlock':
          this.checkPageBreak(config, 30);
          config.doc.setFont('courier', 'normal');
          config.doc.setFontSize(9);

          if (node.content) {
            const codeText = this.cleanTextForPDF(
              this.extractTextFromContent(node.content),
            );
            const lines = config.doc.splitTextToSize(
              codeText,
              config.contentWidth - 10,
            );

            for (const line of lines) {
              this.checkPageBreak(config);
              config.doc.text(line, config.margin + 5, config.yPosition);
              config.yPosition += config.lineHeight;
            }
          }

          config.doc.setFont('helvetica', 'normal');
          config.doc.setFontSize(config.defaultFontSize);
          config.yPosition += config.lineHeight;
          break;

        case 'blockquote':
          this.checkPageBreak(config, 20);
          config.doc.setTextColor(100, 100, 100);

          if (node.content) {
            for (const quoteNode of node.content) {
              if (quoteNode.content) {
                const quoteText = this.cleanTextForPDF(
                  this.extractTextFromContent(quoteNode.content),
                );
                const lines = config.doc.splitTextToSize(
                  quoteText,
                  config.contentWidth - 15,
                );

                for (const line of lines) {
                  this.checkPageBreak(config);
                  config.doc.text(line, config.margin + 10, config.yPosition);
                  config.yPosition += config.lineHeight;
                }
              }
            }
          }

          config.doc.setTextColor(0, 0, 0);
          config.yPosition += config.lineHeight;
          break;

        case 'hardBreak':
          config.yPosition += config.lineHeight;
          break;

        default:
          if (node.content) {
            this.processContent(config, node.content);
          }
      }
    }
  }

  renderPoliciesPdfBuffer(
    policies: PolicyForPDF[],
    organizationName?: string,
    primaryColor?: string | null,
    totalPoliciesCount?: number,
  ): Buffer {
    const doc = new jsPDF();
    const config: PDFConfig = {
      doc,
      pageWidth: doc.internal.pageSize.getWidth(),
      pageHeight: doc.internal.pageSize.getHeight(),
      margin: 20,
      contentWidth: doc.internal.pageSize.getWidth() - 40,
      lineHeight: 6,
      defaultFontSize: 10,
      yPosition: 20,
    };

    // Get organization primary color or use default
    const accentColor = this.getAccentColor(primaryColor);

    // Add organization header if provided
    if (organizationName) {
      const cleanOrgName = this.cleanTextForPDF(organizationName);
      
      // Draw colored accent line at the top
      config.doc.setLineWidth(3);
      config.doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
      config.doc.line(
        config.margin,
        config.yPosition,
        config.pageWidth - config.margin,
        config.yPosition,
      );
      
      config.yPosition += config.lineHeight * 2.5;

      // Organization name - large and bold
      config.doc.setFontSize(24);
      config.doc.setFont('helvetica', 'bold');
      config.doc.setTextColor(0, 0, 0);
      config.doc.text(cleanOrgName, config.margin, config.yPosition);
      
      config.yPosition += config.lineHeight * 2;

      // "All Policies" subtitle - simple and clean
      config.doc.setFontSize(14);
      config.doc.setFont('helvetica', 'normal');
      config.doc.setTextColor(100, 100, 100); // Light gray
      config.doc.text('All Policies', config.margin, config.yPosition);
      
      config.yPosition += config.lineHeight * 2;

      // Metadata - minimal styling
      config.doc.setFontSize(9);
      config.doc.setFont('helvetica', 'normal');
      config.doc.setTextColor(140, 140, 140); // Lighter gray
      
      const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      config.doc.text(
        `${generatedDate}`,
        config.margin,
        config.yPosition,
      );

      config.yPosition += config.lineHeight * 1.2;

      config.doc.text(
        `Total Policies: ${totalPoliciesCount ?? policies.length}`,
        config.margin,
        config.yPosition,
      );

      // Extra spacing before policies
      config.yPosition += config.lineHeight * 3;
    }

    policies.forEach((policy, index) => {
      config.doc.setTextColor(0, 0, 0);

      if (index > 0) {
        config.doc.addPage();
        config.yPosition = config.margin;
      }

      // Add visual policy separator with icon and styled header
      if (policy.name) {
        // Draw accent bar with organization's primary color
        config.doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        config.doc.rect(
          config.margin,
          config.yPosition,
          4,
          12,
          'F',
        );

        // Add "POLICY:" label and title
        config.doc.setFontSize(14);
        config.doc.setFont('helvetica', 'bold');
        config.doc.setTextColor(30, 41, 59); // Dark slate color
        const policyTitle = this.cleanTextForPDF(`POLICY: ${policy.name}`);
        config.doc.text(policyTitle, config.margin + 10, config.yPosition + 8);

        config.yPosition += config.lineHeight * 4;
      }

      if (policy.content) {
        let policyContent: JSONContent[];
        if (Array.isArray(policy.content)) {
          policyContent = this.convertToInternalFormat(policy.content);
        } else if (
          typeof policy.content === 'object' &&
          policy.content.content
        ) {
          policyContent = this.convertToInternalFormat(policy.content.content);
        } else {
          policyContent = [];
        }

        config.doc.setFontSize(config.defaultFontSize);
        config.doc.setFont('helvetica', 'normal');
        this.processContent(config, policyContent);
      }

      config.yPosition += config.lineHeight * 2;
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Policy page ${i} of ${totalPages}`,
        config.pageWidth / 2,
        config.pageHeight - 10,
        { align: 'center' },
      );
    }

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}
