import { jsPDF } from 'jspdf';
import type { JSONContent as TipTapJSONContent } from '@tiptap/react';

// Type definition for the JSON content structure
interface JSONContent {
  type: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  text?: string;
  marks?: Array<{ type: string }>;
}

/**
 * Converts JSON content to a formatted PDF document
 */
export function generatePolicyPDF(jsonContent: TipTapJSONContent[], policyTitle?: string): void {
  // Convert TipTap JSONContent to our internal format
  const convertToInternalFormat = (content: TipTapJSONContent[]): JSONContent[] => {
    return content.map(item => ({
      type: item.type || 'paragraph',
      attrs: item.attrs,
      content: item.content ? convertToInternalFormat(item.content) : undefined,
      text: item.text,
      marks: item.marks
    }));
  };
  
  const internalContent = convertToInternalFormat(jsonContent);
  
  // Helper function to clean text for PDF rendering
  const cleanTextForPDF = (text: string): string => {
    return text.replace(/[^\x00-\x7F]/g, function(char) {
      const replacements: { [key: string]: string } = {
        '\u2018': "'", // left single quotation mark
        '\u2019': "'", // right single quotation mark
        '\u201C': '"', // left double quotation mark
        '\u201D': '"', // right double quotation mark
        '\u2013': '-', // en dash
        '\u2014': '-', // em dash
        '\u2026': '...', // horizontal ellipsis
        '\u00F1': 'n' // ñ
      };
      return replacements[char] || char;
    });
  };
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  let yPosition = margin;
  const lineHeight = 6;
  const defaultFontSize = 10;
  
  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight: number = lineHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };
  
  // Helper function to add text with word wrapping
  const addTextWithWrapping = (text: string, fontSize: number = defaultFontSize, isBold: boolean = false) => {
    const cleanText = cleanTextForPDF(text);
    
    // Always reset font properties before setting new ones
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(cleanText, contentWidth);
    
    for (const line of lines) {
      checkPageBreak();
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }
  };
  
  // Add title if provided
  if (policyTitle) {
    const cleanTitle = cleanTextForPDF(policyTitle);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanTitle, margin, yPosition);
    yPosition += lineHeight * 2;
  }
  
  // Process JSON content recursively
  const processContent = (content: JSONContent[], level: number = 0) => {
    for (const item of content) {
      switch (item.type) {
        case 'heading':
          const headingLevel = item.attrs?.level || 1;
          let fontSize: number;
          let spacingBefore: number;
          let spacingAfter: number;
          
          switch (headingLevel) {
            case 1:
              fontSize = 14;
              spacingBefore = lineHeight * 2;
              spacingAfter = lineHeight;
              break;
            case 2:
              fontSize = 12;
              spacingBefore = lineHeight * 1.5;
              spacingAfter = lineHeight * 0.5;
              break;
            case 3:
              fontSize = 11;
              spacingBefore = lineHeight;
              spacingAfter = lineHeight * 0.5;
              break;
            default:
              fontSize = defaultFontSize;
              spacingBefore = lineHeight;
              spacingAfter = lineHeight * 0.5;
          }
          
          yPosition += spacingBefore;
          checkPageBreak();
          
          if (item.content) {
            const headingText = extractTextFromContent(item.content);
            addTextWithWrapping(headingText, fontSize, true);
          }
          
          yPosition += spacingAfter;
          break;
          
        case 'paragraph':
          if (item.content) {
            const paragraphText = extractTextFromContent(item.content);
            if (paragraphText.trim()) {
              // Use the enhanced formatting function for paragraphs to handle bold text
              const startY = yPosition;
              renderFormattedContent(item.content, margin, contentWidth);
              // Only add spacing if content was actually rendered
              if (yPosition > startY) {
                yPosition += lineHeight * 0.5; // Small spacing after paragraphs
              }
            }
          }
          break;
          
        case 'bulletList':
          if (item.content) {
            for (const listItem of item.content) {
              if (listItem.type === 'listItem' && listItem.content) {
                const listText = extractTextFromContent(listItem.content);
                checkPageBreak();
                
                // Add bullet point with consistent font
                doc.setFontSize(defaultFontSize);
                doc.setFont('helvetica', 'normal');
                doc.text('•', margin + level * 10, yPosition);
                
                // Add indented text with proper font reset
                doc.setFontSize(defaultFontSize);
                doc.setFont('helvetica', 'normal');
                const cleanText = cleanTextForPDF(listText);
                const lines = doc.splitTextToSize(cleanText, contentWidth - 8 - level * 10);
                for (let i = 0; i < lines.length; i++) {
                  checkPageBreak();
                  doc.text(lines[i], margin + 5 + level * 10, yPosition);
                  yPosition += lineHeight;
                }
                yPosition += lineHeight * 0.3; // Small spacing between list items
              }
            }
          }
          break;
          
        case 'orderedList':
          if (item.content) {
            let itemNumber = 1;
            for (const listItem of item.content) {
              if (listItem.type === 'listItem' && listItem.content) {
                const listText = extractTextFromContent(listItem.content);
                checkPageBreak();
                
                // Add number with consistent font
                doc.setFontSize(defaultFontSize);
                doc.setFont('helvetica', 'normal');
                doc.text(`${itemNumber}.`, margin + level * 10, yPosition);
                
                // Add indented text with proper font reset
                doc.setFontSize(defaultFontSize);
                doc.setFont('helvetica', 'normal');
                const cleanText = cleanTextForPDF(listText);
                const lines = doc.splitTextToSize(cleanText, contentWidth - 10 - level * 10);
                for (let i = 0; i < lines.length; i++) {
                  checkPageBreak();
                  doc.text(lines[i], margin + 8 + level * 10, yPosition);
                  yPosition += lineHeight;
                }
                yPosition += lineHeight * 0.3; // Small spacing between list items
                itemNumber++;
              }
            }
          }
          break;
      }
    }
  };
  
  // Helper function to extract text from content array with formatting awareness
  const extractTextFromContent = (content: JSONContent[]): string => {
    return content.map(item => {
      if (item.text) {
        return item.text;
      } else if (item.content) {
        return extractTextFromContent(item.content);
      }
      return '';
    }).join('');
  };

  // Enhanced helper function that renders text with proper formatting
  const renderFormattedContent = (content: JSONContent[], xPos: number, maxWidth: number, level: number = 0) => {
    for (const item of content) {
      if (item.text) {
        const isBold = item.marks?.some(mark => mark.type === 'bold') || false;
        const cleanText = cleanTextForPDF(item.text);
        
        doc.setFontSize(defaultFontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const lines = doc.splitTextToSize(cleanText, maxWidth);
        for (const line of lines) {
          checkPageBreak();
          doc.text(line, xPos, yPosition);
          yPosition += lineHeight;
        }
      } else if (item.content) {
        renderFormattedContent(item.content, xPos, maxWidth, level);
      }
    }
  };
  
  // Process the main content
  processContent(internalContent);
  
  // Add footer with page numbers
  const totalPages = doc.internal.pages.length - 1; // Subtract 1 because of the null page at index 0
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 30, pageHeight - 10);
  }
  
  // Save the PDF
  const filename = policyTitle 
    ? `${policyTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-policy.pdf`
    : 'policy-document.pdf';
  
  doc.save(filename);
}

/**
 * Alternative function that generates a more readable HTML-style PDF
 */
export function generatePolicyPDFFromHTML(jsonContent: TipTapJSONContent[], policyTitle?: string): void {
  // Convert TipTap JSONContent to our internal format
  const convertToInternalFormat = (content: TipTapJSONContent[]): JSONContent[] => {
    return content.map(item => ({
      type: item.type || 'paragraph',
      attrs: item.attrs,
      content: item.content ? convertToInternalFormat(item.content) : undefined,
      text: item.text,
      marks: item.marks
    }));
  };
  
  const internalContent = convertToInternalFormat(jsonContent);
  // Convert JSON to HTML first
  const htmlContent = convertJSONToHTML(internalContent);
  
  // Create a temporary HTML page for PDF generation
  const htmlPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${policyTitle || 'Policy Document'}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        h1 { font-size: 24px; margin-bottom: 20px; color: #1a1a1a; }
        h2 { font-size: 20px; margin-top: 30px; margin-bottom: 15px; color: #2a2a2a; }
        h3 { font-size: 16px; margin-top: 25px; margin-bottom: 12px; color: #3a3a3a; }
        p { margin-bottom: 15px; }
        ul, ol { margin-bottom: 15px; padding-left: 25px; }
        li { margin-bottom: 8px; }
        strong { font-weight: 600; }
        @media print {
          body { margin: 0; padding: 20px; }
          @page { margin: 1in; }
        }
      </style>
    </head>
    <body>
      ${policyTitle ? `<h1>${policyTitle}</h1>` : ''}
      ${htmlContent}
    </body>
    </html>
  `;
  
  // Create a blob and download link
  const blob = new Blob([htmlPage], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      // Focus the iframe and trigger print dialog (user can save as PDF)
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    }, 250);
  };
}

/**
 * Convert JSON content to HTML string
 */
function convertJSONToHTML(content: JSONContent[]): string {
  return content.map(item => {
    switch (item.type) {
      case 'heading':
        const level = item.attrs?.level || 1;
        const headingText = item.content ? extractTextFromContent(item.content) : '';
        return `<h${level}>${headingText}</h${level}>`;
        
      case 'paragraph':
        const paragraphText = item.content ? extractTextFromContent(item.content) : '';
        return `<p>${paragraphText}</p>`;
        
      case 'bulletList':
        const bulletItems = item.content?.map(listItem => {
          if (listItem.type === 'listItem' && listItem.content) {
            const text = extractTextFromContent(listItem.content);
            return `<li>${text}</li>`;
          }
          return '';
        }).join('') || '';
        return `<ul>${bulletItems}</ul>`;
        
      case 'orderedList':
        const orderedItems = item.content?.map(listItem => {
          if (listItem.type === 'listItem' && listItem.content) {
            const text = extractTextFromContent(listItem.content);
            return `<li>${text}</li>`;
          }
          return '';
        }).join('') || '';
        return `<ol>${orderedItems}</ol>`;
        
      default:
        return '';
    }
  }).join('');
}

/**
 * Extract plain text from nested content structure
 */
function extractTextFromContent(content: JSONContent[]): string {
  return content.map(item => {
    if (item.text) {
      // Apply formatting based on marks
      let text = item.text;
      if (item.marks?.some(mark => mark.type === 'bold')) {
        text = `<strong>${text}</strong>`;
      }
      return text;
    } else if (item.content) {
      return extractTextFromContent(item.content);
    }
    return '';
  }).join('');
}
