import { jsPDF } from 'jspdf';
import type { JSONContent as TipTapJSONContent } from '@tiptap/react';
import { AuditLog, User, Member, Organization, Policy } from '@db';
import { format } from 'date-fns';

// Type definition for the JSON content structure
interface JSONContent {
  type: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  text?: string;
  marks?: Array<{ type: string }>;
}

type AuditLogWithRelations = AuditLog & {
  user: User | null;
  member: Member | null;
  organization: Organization;
};

// Shared PDF configuration
interface PDFConfig {
  doc: any;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  lineHeight: number;
  defaultFontSize: number;
  yPosition: number;
}

// Helper function to clean text for PDF rendering
const cleanTextForPDF = (text: string): string => {
  // First, handle specific problematic characters that cause font issues
  const replacements: { [key: string]: string } = {
    '\u2018': "'", // left single quotation mark
    '\u2019': "'", // right single quotation mark
    '\u201C': '"', // left double quotation mark
    '\u201D': '"', // right double quotation mark
    '\u2013': '-', // en dash
    '\u2014': '-', // em dash
    '\u2026': '...', // horizontal ellipsis
    '\u2265': '>=', // greater than or equal to (≥)
    '\u2264': '<=', // less than or equal to (≤)
    '\u00B0': 'deg', // degree symbol (°)
    '\u00A9': '(c)', // copyright symbol (©)
    '\u00AE': '(R)', // registered trademark (®)
    '\u2122': 'TM', // trademark symbol (™)
    '\u00A0': ' ', // non-breaking space
    '\u2022': '•', // bullet point (ensure consistent bullet)
    '\u00B1': '+/-', // plus-minus symbol (±)
    '\u00D7': 'x', // multiplication sign (×)
    '\u00F7': '/', // division sign (÷)
    '\u2192': '->', // right arrow (→)
    '\u2190': '<-', // left arrow (←)
    '\u2194': '<->', // left-right arrow (↔)
  };

  // Replace known problematic characters
  let cleanedText = text;
  for (const [unicode, replacement] of Object.entries(replacements)) {
    cleanedText = cleanedText.replace(new RegExp(unicode, 'g'), replacement);
  }

  // For any remaining non-ASCII characters, try to preserve them first
  // Only replace if they cause font rendering issues
  return cleanedText.replace(/[^\x00-\x7F]/g, function(char) {
    // Common accented characters that should work fine in most PDF fonts
    const safeChars = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß]/;
    
    if (safeChars.test(char)) {
      return char; // Keep safe accented characters
    }
    
    // For other characters, provide basic ASCII fallbacks
    const fallbacks: { [key: string]: string } = {
      'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
      'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
      'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
      'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
      'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
      'ñ': 'n', 'ç': 'c', 'ß': 'ss', 'ÿ': 'y',
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
      'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
      'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
      'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
      'Ñ': 'N', 'Ç': 'C', 'Ý': 'Y'
    };
    
    return fallbacks[char] || '?'; // Use ? for unknown characters
  });
};

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

// Helper function to check for page breaks
const checkPageBreak = (config: PDFConfig, requiredHeight: number = config.lineHeight) => {
  if (config.yPosition + requiredHeight > config.pageHeight - config.margin) {
    config.doc.addPage();
    config.yPosition = config.margin;
  }
};

// Helper function to add text with word wrapping
const addTextWithWrapping = (
  config: PDFConfig, 
  text: string, 
  fontSize: number = config.defaultFontSize, 
  isBold: boolean = false
) => {
  const cleanText = cleanTextForPDF(text);
  
  // Always reset font properties and color before setting new ones
  config.doc.setFontSize(fontSize);
  config.doc.setTextColor(0, 0, 0); // Ensure text is black
  if (isBold) {
    config.doc.setFont('helvetica', 'bold');
  } else {
    config.doc.setFont('helvetica', 'normal');
  }
  
  const lines = config.doc.splitTextToSize(cleanText, config.contentWidth);
  
  for (const line of lines) {
    checkPageBreak(config);
    config.doc.text(line, config.margin, config.yPosition);
    config.yPosition += config.lineHeight;
  }
};

// Helper function to extract text from content array
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
const renderFormattedContent = (
  config: PDFConfig,
  content: JSONContent[], 
  xPos: number, 
  maxWidth: number
) => {
  for (const item of content) {
    if (item.text) {
      const isBold = item.marks?.some(mark => mark.type === 'bold') || false;
      const cleanText = cleanTextForPDF(item.text);
      
      config.doc.setFontSize(config.defaultFontSize);
      config.doc.setTextColor(0, 0, 0); // Ensure text is black
      config.doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      const lines = config.doc.splitTextToSize(cleanText, maxWidth);
      for (const line of lines) {
        checkPageBreak(config);
        config.doc.text(line, xPos, config.yPosition);
        config.yPosition += config.lineHeight;
      }
    } else if (item.content) {
      renderFormattedContent(config, item.content, xPos, maxWidth);
    }
  }
};

// Process JSON content recursively
const processContent = (config: PDFConfig, content: JSONContent[], level: number = 0) => {
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
            spacingBefore = config.lineHeight * 2;
            spacingAfter = config.lineHeight;
            break;
          case 2:
            fontSize = 12;
            spacingBefore = config.lineHeight * 1.5;
            spacingAfter = config.lineHeight * 0.5;
            break;
          case 3:
            fontSize = 11;
            spacingBefore = config.lineHeight;
            spacingAfter = config.lineHeight * 0.5;
            break;
          default:
            fontSize = config.defaultFontSize;
            spacingBefore = config.lineHeight;
            spacingAfter = config.lineHeight * 0.5;
        }
        
        config.yPosition += spacingBefore;
        checkPageBreak(config);
        
        if (item.content) {
          const headingText = extractTextFromContent(item.content);
          addTextWithWrapping(config, headingText, fontSize, true);
        }
        
        config.yPosition += spacingAfter;
        break;
        
      case 'paragraph':
        if (item.content) {
          const paragraphText = extractTextFromContent(item.content);
          if (paragraphText.trim()) {
            // Use the enhanced formatting function for paragraphs to handle bold text
            const startY = config.yPosition;
            renderFormattedContent(config, item.content, config.margin, config.contentWidth);
            // Only add spacing if content was actually rendered
            if (config.yPosition > startY) {
              config.yPosition += config.lineHeight * 0.5; // Small spacing after paragraphs
            }
          }
        }
        break;
        
      case 'bulletList':
        if (item.content) {
          for (const listItem of item.content) {
            if (listItem.type === 'listItem' && listItem.content) {
              const listText = extractTextFromContent(listItem.content);
              checkPageBreak(config);
              
              // Add bullet point with consistent font
              config.doc.setFontSize(config.defaultFontSize);
              config.doc.setFont('helvetica', 'normal');
              config.doc.setTextColor(0, 0, 0); // Ensure bullet is black
              config.doc.text('•', config.margin + level * 10, config.yPosition);
              
              // Add indented text with proper font reset
              config.doc.setFontSize(config.defaultFontSize);
              config.doc.setFont('helvetica', 'normal');
              config.doc.setTextColor(0, 0, 0); // Ensure text is black
              const cleanText = cleanTextForPDF(listText);
              const lines = config.doc.splitTextToSize(cleanText, config.contentWidth - 8 - level * 10);
              for (let i = 0; i < lines.length; i++) {
                checkPageBreak(config);
                config.doc.text(lines[i], config.margin + 5 + level * 10, config.yPosition);
                config.yPosition += config.lineHeight;
              }
              config.yPosition += config.lineHeight * 0.3; // Small spacing between list items
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
              checkPageBreak(config);
              
              // Add number with consistent font
              config.doc.setFontSize(config.defaultFontSize);
              config.doc.setFont('helvetica', 'normal');
              config.doc.setTextColor(0, 0, 0); // Ensure number is black
              config.doc.text(`${itemNumber}.`, config.margin + level * 10, config.yPosition);
              
              // Add indented text with proper font reset
              config.doc.setFontSize(config.defaultFontSize);
              config.doc.setFont('helvetica', 'normal');
              config.doc.setTextColor(0, 0, 0); // Ensure text is black
              const cleanText = cleanTextForPDF(listText);
              const lines = config.doc.splitTextToSize(cleanText, config.contentWidth - 10 - level * 10);
              for (let i = 0; i < lines.length; i++) {
                checkPageBreak(config);
                config.doc.text(lines[i], config.margin + 8 + level * 10, config.yPosition);
                config.yPosition += config.lineHeight;
              }
              config.yPosition += config.lineHeight * 0.3; // Small spacing between list items
              itemNumber++;
            }
          }
        }
        break;
    }
  }
};

// Function to add audit logs table
const addAuditLogsTable = (config: PDFConfig, auditLogs: AuditLogWithRelations[], isCompact: boolean = false) => {
  checkPageBreak(config, config.lineHeight * 6); // Ensure we have space for at least the header
  
  // Reset text color to black for table
  config.doc.setTextColor(0, 0, 0);
  
  // Table configuration
  const tableStartY = config.yPosition;
  const colWidths = {
    name: config.contentWidth * 0.25,      // 25% for Name
    description: config.contentWidth * 0.55, // 55% for Description  
    datetime: config.contentWidth * 0.20     // 20% for Date/Time
  };
  
  const colPositions = {
    name: config.margin,
    description: config.margin + colWidths.name,
    datetime: config.margin + colWidths.name + colWidths.description
  };
  
  // Adjust font sizes based on compact mode
  const headerFontSize = isCompact ? 9 : 10;
  const contentFontSize = isCompact ? 8 : 9;
  
  // Draw table header
  config.doc.setFontSize(headerFontSize);
  config.doc.setFont('helvetica', 'bold');
  
  // Header background (light gray)
  config.doc.setFillColor(240, 240, 240);
  config.doc.rect(config.margin, config.yPosition - 2, config.contentWidth, config.lineHeight + 2, 'F');
  
  // Header text
  config.doc.setTextColor(0, 0, 0);
  config.doc.text('Name', colPositions.name + 2, config.yPosition + 4);
  config.doc.text('Description', colPositions.description + 2, config.yPosition + 4);
  config.doc.text('Date/Time', colPositions.datetime + 2, config.yPosition + 4);
  
  config.yPosition += config.lineHeight + 2;
  
  // Draw table rows
  config.doc.setFont('helvetica', 'normal');
  config.doc.setFontSize(contentFontSize);
  
  auditLogs.forEach((log, index) => {
    const rowY = config.yPosition;
    
    // Check for page break
    checkPageBreak(config, config.lineHeight * 2);
    
    // Alternate row background
    if (index % 2 === 0) {
      config.doc.setFillColor(248, 248, 248);
      config.doc.rect(config.margin, config.yPosition - 1, config.contentWidth, config.lineHeight + 2, 'F');
    }
    
    // Extract user info
    const userName = log.user?.name || `User ${log.userId.substring(0, 6)}`;
    const description = log.description || 'No description available';
    const dateTime = format(log.timestamp, 'MMM d, yyyy h:mm a');
    
    // Draw cell contents with text wrapping for description
    config.doc.setTextColor(0, 0, 0);
    
    // Name column (truncate if too long)
    const nameText = userName.length > 20 ? userName.substring(0, 17) + '...' : userName;
    config.doc.text(nameText, colPositions.name + 2, config.yPosition + 4);
    
    // Description column (wrap text)
    const descLines = config.doc.splitTextToSize(description, colWidths.description - 4);
    const maxDescLines = 2; // Limit to 2 lines to keep row height manageable
    const displayLines = descLines.slice(0, maxDescLines);
    
    displayLines.forEach((line: string, lineIndex: number) => {
      config.doc.text(line, colPositions.description + 2, config.yPosition + 4 + (lineIndex * 4));
    });
    
    // If text was truncated, add ellipsis
    if (descLines.length > maxDescLines) {
      const lastLine = displayLines[displayLines.length - 1];
      const ellipsisLine = lastLine.length > 40 ? lastLine.substring(0, 37) + '...' : lastLine + '...';
      config.doc.text(ellipsisLine, colPositions.description + 2, config.yPosition + 4 + ((maxDescLines - 1) * 4));
    }
    
    // Date/Time column
    config.doc.text(dateTime, colPositions.datetime + 2, config.yPosition + 4);
    
    // Calculate row height based on description lines
    const rowHeight = Math.max(config.lineHeight + 2, (displayLines.length * 4) + 2);
    config.yPosition += rowHeight;
    
    // Draw row border
    config.doc.setDrawColor(200, 200, 200);
    config.doc.setLineWidth(0.1);
    config.doc.line(config.margin, rowY + rowHeight, config.margin + config.contentWidth, rowY + rowHeight);
  });
  
  // Draw table borders
  config.doc.setDrawColor(150, 150, 150);
  config.doc.setLineWidth(0.3);
  
  // Outer border
  config.doc.rect(config.margin, tableStartY - 2, config.contentWidth, config.yPosition - (tableStartY - 2));
  
  // Column separators
  config.doc.line(colPositions.description, tableStartY - 2, colPositions.description, config.yPosition);
  config.doc.line(colPositions.datetime, tableStartY - 2, colPositions.datetime, config.yPosition);
  
  // Add some space after the table
  config.yPosition += config.lineHeight;
};

// Function to add audit logs section (table or no activity message)
const addAuditLogsSection = (config: PDFConfig, auditLogs: AuditLogWithRelations[], isCompact: boolean = false) => {
  // Add some space before the section
  config.yPosition += config.lineHeight * 2;
  checkPageBreak(config, config.lineHeight * 3); // Ensure we have space for at least the header
  
  // Add section title
  const titleFontSize = isCompact ? 12 : 14;
  config.doc.setFontSize(titleFontSize);
  config.doc.setFont('helvetica', 'bold');
  config.doc.setTextColor(0, 0, 0); // Ensure title is black
  config.doc.text('Recent Activity', config.margin, config.yPosition);
  config.yPosition += config.lineHeight * 1.5;
  
  if (!auditLogs || auditLogs.length === 0) {
    // Show "No recent activity" message
    const messageFontSize = isCompact ? 9 : 10;
    config.doc.setFontSize(messageFontSize);
    config.doc.setFont('helvetica', 'normal');
    config.doc.setTextColor(100, 100, 100); // Gray color
    config.doc.text('No recent activity', config.margin, config.yPosition);
    config.yPosition += config.lineHeight;
    
    // Reset text color to black after gray message
    config.doc.setTextColor(0, 0, 0);
    return;
  }
  
  // Show the table
  addAuditLogsTable(config, auditLogs, isCompact);
};

// Function to add page numbers to all pages
const addPageNumbers = (config: PDFConfig) => {
  const totalPages = config.doc.internal.pages.length - 1; // Subtract 1 because of the null page at index 0
  for (let i = 1; i <= totalPages; i++) {
    config.doc.setPage(i);
    config.doc.setFontSize(8);
    config.doc.setFont('helvetica', 'normal');
    config.doc.text(`Page ${i} of ${totalPages}`, config.pageWidth - config.margin - 30, config.pageHeight - 10);
  }
};

/**
 * Converts JSON content to a formatted PDF document
 */
export function generatePolicyPDF(jsonContent: TipTapJSONContent[], logs: AuditLogWithRelations[], policyTitle?: string): void {
  const internalContent = convertToInternalFormat(jsonContent);
  
  const doc = new jsPDF();
  const config: PDFConfig = {
    doc,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 20,
    contentWidth: doc.internal.pageSize.getWidth() - 40,
    lineHeight: 6,
    defaultFontSize: 10,
    yPosition: 20
  };
  
  // Add title if provided
  if (policyTitle) {
    const cleanTitle = cleanTextForPDF(policyTitle);
    
    config.doc.setFontSize(16);
    config.doc.setFont('helvetica', 'bold');
    config.doc.text(cleanTitle, config.margin, config.yPosition);
    config.yPosition += config.lineHeight * 2;
  }
  
  // Process the main content
  processContent(config, internalContent);
  
  // Add audit logs section
  addAuditLogsSection(config, logs);
  
  // Add page numbers
  addPageNumbers(config);
  
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
 * Downloads all policies into one PDF document
 */
export function downloadAllPolicies(
  policies: Policy[], 
  policyLogs: { [policyId: string]: AuditLogWithRelations[] },
  organizationName?: string
): void {
  const doc = new jsPDF();
  const config: PDFConfig = {
    doc,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 20,
    contentWidth: doc.internal.pageSize.getWidth() - 40,
    lineHeight: 6,
    defaultFontSize: 10,
    yPosition: 20
  };
  
  // Add document title
  const documentTitle = organizationName ? `${organizationName} - All Policies` : 'All Policies';
  const cleanTitle = cleanTextForPDF(documentTitle);
  
  config.doc.setFontSize(18);
  config.doc.setFont('helvetica', 'bold');
  config.doc.text(cleanTitle, config.margin, config.yPosition);
  config.yPosition += config.lineHeight * 3;
  
  // Process each policy
  policies.forEach((policy, index) => {
    // Reset text color to black for each policy
    config.doc.setTextColor(0, 0, 0);
    
    // Start each policy on a new page (except the first one)
    if (index > 0) {
      config.doc.addPage();
      config.yPosition = config.margin;
    }
    
    // Add policy title
    if (policy.name) {
      const cleanPolicyTitle = cleanTextForPDF(policy.name);
      config.doc.setFontSize(16);
      config.doc.setFont('helvetica', 'bold');
      config.doc.setTextColor(0, 0, 0); // Ensure title is black
      config.doc.text(cleanPolicyTitle, config.margin, config.yPosition);
      config.yPosition += config.lineHeight * 2;
    }
    
    // Process policy content
    if (policy.content) {
      let policyContent: TipTapJSONContent[];
      if (Array.isArray(policy.content)) {
        policyContent = policy.content as TipTapJSONContent[];
      } else if (typeof policy.content === 'object' && policy.content !== null) {
        policyContent = [policy.content as TipTapJSONContent];
      } else {
        // Skip this policy if content format is invalid
        return;
      }
      
      const internalContent = convertToInternalFormat(policyContent);
      processContent(config, internalContent);
    }
    
    // Add audit logs section for this policy (compact mode)
    const logs = policyLogs[policy.id] || [];
    addAuditLogsSection(config, logs, true); // true for compact mode
  });
  
  // Add page numbers
  addPageNumbers(config);
  
  // Save the PDF
  const filename = organizationName 
    ? `${organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-all-policies.pdf`
    : 'all-policies.pdf';
  
  doc.save(filename);
}
