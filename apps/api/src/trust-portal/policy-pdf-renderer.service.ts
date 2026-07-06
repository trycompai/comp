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

// Keep-together: minimum number of body lines that must fit on the same page
// as a heading. If the heading plus this many lines of the following section
// don't fit, the heading is pushed to the next page so it isn't orphaned at
// the bottom of a page (CS-704).
// NOTE: Keep in sync with apps/app/src/lib/pdf-generator.ts HEADING_KEEP_WITH_LINES
const HEADING_KEEP_WITH_LINES = 3;

// Default vertical room (mm) checkPageBreak requires below the cursor before
// committing content to the current page. Body lines are laid out one at a
// time and each one demands this much space, so the heading keep-together
// reserve must include one such look-ahead for the following section.
const DEFAULT_BREAK_SPACE = 20;

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
  private getAccentColor(primaryColor: string | null | undefined): {
    r: number;
    g: number;
    b: number;
  } {
    // Default project primary color: dark teal/green (hsl(165, 100%, 15%) = #004D3D)
    const defaultColor = { r: 0, g: 77, b: 61 };

    if (!primaryColor) {
      return defaultColor;
    }

    const color = this.hexToRgb(primaryColor);

    // Check for NaN values (parseInt returns NaN for invalid hex)
    if (
      Number.isNaN(color.r) ||
      Number.isNaN(color.g) ||
      Number.isNaN(color.b)
    ) {
      console.warn(
        'Invalid primary color format, using default:',
        primaryColor,
      );
      return defaultColor;
    }

    return color;
  }

  /**
   * Clean text for safe rendering with standard PDF fonts (Helvetica).
   * Strips invisible chars, emojis, and maps typographic chars to ASCII.
   *
   * NOTE: Keep in sync with apps/app/src/lib/pdf-generator.ts cleanTextForPDF
   */
  private cleanTextForPDF(text: string): string {
    const strippedText = text
      .replace(/\u00AD/g, '')
      .replace(/[\u200B-\u200F]/g, '')
      .replace(/[\u202A-\u202E]/g, '')
      .replace(/[\u2060-\u206F]/g, '')
      .replace(/\uFEFF/g, '')
      .replace(/\uFFFD/g, '')
      // Strip emoji characters — standard PDF fonts cannot render them
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
        '',
      );

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
      return fallbacks[char] ?? char;
    });
  }

  private convertToInternalFormat(content: any[]): JSONContent[] {
    // Imported / non-TipTap policy content (e.g. Drata migrations) can have a
    // `content` field that is a string or object instead of a JSONContent[]
    // array. Guard so .map never runs on a non-array and throws
    // "content.map is not a function" — a single malformed policy used to
    // reject the entire download-all bundle with a 500.
    if (!Array.isArray(content)) {
      return [];
    }
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

  private checkPageBreak(
    config: PDFConfig,
    requiredSpace: number = DEFAULT_BREAK_SPACE,
  ): void {
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
    for (const [nodeIndex, node] of content.entries()) {
      switch (node.type) {
        case 'heading': {
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

          // Measure the heading against the heading font BEFORE deciding
          // whether it fits, so multi-line headings are counted correctly.
          const headingText = node.content
            ? this.cleanTextForPDF(this.extractTextFromContent(node.content))
            : '';
          const headingLines = headingText
            ? (config.doc.splitTextToSize(
                headingText,
                config.contentWidth,
              ) as string[])
            : [];

          // Keep-together: require room for the heading itself PLUS the first
          // few lines of the section that follows it; otherwise push the whole
          // heading to the next page so it isn't stranded at the page bottom.
          // Only reserve the following-section space when content actually
          // follows this heading (a trailing heading shouldn't be pushed to a
          // page of its own).
          //
          // The heading advances the cursor by its own height plus a trailing
          // gap (config.lineHeight), then each following body line advances
          // config.lineHeight and the last one still needs DEFAULT_BREAK_SPACE
          // of look-ahead — hence: headingHeight + keepWithLines * lineHeight
          // (trailing gap + first keepWithLines-1 advances) + one look-ahead.
          const hasFollowingContent = nodeIndex < content.length - 1;
          const headingHeight =
            Math.max(headingLines.length, 1) * config.lineHeight * 1.2;
          const requiredHeight = hasFollowingContent
            ? headingHeight +
              HEADING_KEEP_WITH_LINES * config.lineHeight +
              DEFAULT_BREAK_SPACE
            : headingHeight;
          this.checkPageBreak(config, requiredHeight);

          // The up-front check guarantees the whole heading fits, so render its
          // lines without further page-break checks (which could split the
          // heading across pages).
          for (const line of headingLines) {
            config.doc.text(line, config.margin, config.yPosition);
            config.yPosition += config.lineHeight * 1.2;
          }

          config.doc.setFontSize(config.defaultFontSize);
          config.doc.setFont('helvetica', 'normal');
          config.yPosition += config.lineHeight;
          break;
        }

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

        case 'table':
          this.renderTable(config, node);
          break;

        default:
          if (node.content) {
            this.processContent(config, node.content);
          }
      }
    }
  }

  private renderTable(config: PDFConfig, tableNode: JSONContent): void {
    const rows = tableNode.content;
    if (!rows || rows.length === 0) return;

    const firstRow = rows[0];
    if (!firstRow.content || firstRow.content.length === 0) return;

    // Count columns (including colspans) from the first row
    let columnCount = 0;
    for (const cell of firstRow.content) {
      columnCount += cell.attrs?.colspan ?? 1;
    }
    if (columnCount === 0) return;

    const colWidth = config.contentWidth / columnCount;
    const cellPadding = 2;
    const minCellHeight = config.lineHeight + cellPadding * 2;

    config.doc.setFontSize(config.defaultFontSize);

    for (const row of rows) {
      if (row.type !== 'tableRow' || !row.content) continue;

      // Pre-compute wrapped lines per cell to determine row height
      const cellsInRow: Array<{
        isHeader: boolean;
        lines: string[];
        width: number;
      }> = [];

      for (const cell of row.content) {
        if (cell.type !== 'tableCell' && cell.type !== 'tableHeader') continue;
        const isHeader = cell.type === 'tableHeader';
        const colspan = cell.attrs?.colspan ?? 1;
        const width = colWidth * colspan;
        const rawText = this.extractCellText(cell.content ?? []);
        const cleanText = this.cleanTextForPDF(rawText);
        // splitTextToSize respects embedded \n, so multi-paragraph cells
        // wrap into separate visual rows within the same cell.
        const lines = config.doc.splitTextToSize(
          cleanText || ' ',
          width - cellPadding * 2,
        ) as string[];
        cellsInRow.push({ isHeader, lines, width });
      }

      if (cellsInRow.length === 0) continue;

      const rowHeight = Math.max(
        minCellHeight,
        ...cellsInRow.map(
          (c) => c.lines.length * config.lineHeight + cellPadding * 2,
        ),
      );

      this.checkPageBreak(config, rowHeight);

      const rowY = config.yPosition;
      let xOffset = 0;
      for (const cell of cellsInRow) {
        const x = config.margin + xOffset;

        if (cell.isHeader) {
          config.doc.setFillColor(240, 240, 240);
          config.doc.rect(x, rowY, cell.width, rowHeight, 'F');
        }

        config.doc.setDrawColor(180, 180, 180);
        config.doc.setLineWidth(0.2);
        config.doc.rect(x, rowY, cell.width, rowHeight);

        config.doc.setFont('helvetica', cell.isHeader ? 'bold' : 'normal');
        config.doc.setTextColor(0, 0, 0);
        cell.lines.forEach((line, li) => {
          config.doc.text(
            line,
            x + cellPadding,
            rowY + cellPadding + config.lineHeight * (li + 0.75),
          );
        });

        xOffset += cell.width;
      }

      config.doc.setFont('helvetica', 'normal');
      config.yPosition = rowY + rowHeight;
    }

    config.yPosition += config.lineHeight * 0.5;
  }

  /**
   * Extract display text from a table cell's block-level content.
   *
   * Tiptap cells wrap their content in block nodes — most commonly one
   * `paragraph` per visual line, plus the occasional `hardBreak` inside a
   * paragraph or a `bulletList`/`orderedList`. We need to preserve the visual
   * line boundaries the user sees in the editor so that `splitTextToSize`
   * wraps each intended line separately. Without this, a cell with two
   * paragraphs "Retention Period" and "30 days" renders as the single
   * concatenated string "Retention Period30 days".
   *
   * Block boundaries that insert a newline:
   *  - top-level children of the cell (paragraph, bulletList, etc.)
   *  - each list item inside a bulletList/orderedList
   *  - `hardBreak` nodes
   *
   * Inline marks (bold, italic, link) are flattened to their text — we lose
   * the formatting but the content is complete.
   */
  private extractCellText(cellContent: JSONContent[]): string {
    return cellContent
      .map((block) => this.blockText(block))
      .filter((s) => s.length > 0)
      .join('\n');
  }

  private blockText(node: JSONContent): string {
    if (node.type === 'bulletList') {
      if (!node.content) return '';
      return node.content
        .map((item) => this.renderListItem(item, '•'))
        .filter((s) => s.length > 0)
        .join('\n');
    }
    if (node.type === 'orderedList') {
      if (!node.content) return '';
      return node.content
        .map((item, i) => this.renderListItem(item, `${i + 1}.`))
        .filter((s) => s.length > 0)
        .join('\n');
    }
    if (node.type === 'listItem') {
      // Bare listItem without a parent list (unusual); render without prefix.
      if (!node.content) return '';
      return node.content
        .map((child) => this.blockText(child))
        .filter((s) => s.length > 0)
        .join('\n');
    }
    if (node.type === 'hardBreak') return '\n';
    if (node.text) return node.text;
    if (!node.content) return '';
    return node.content.map((child) => this.blockText(child)).join('');
  }

  private renderListItem(itemNode: JSONContent, prefix: string): string {
    if (!itemNode.content) return '';
    const body = itemNode.content
      .map((child) => this.blockText(child))
      .filter((s) => s.length > 0)
      .join('\n');
    if (!body) return '';
    return `${prefix} ${body}`;
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

      config.doc.text(`${generatedDate}`, config.margin, config.yPosition);

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
        config.doc.rect(config.margin, config.yPosition, 4, 12, 'F');

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
