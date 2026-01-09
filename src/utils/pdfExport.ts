/**
 * PDF Export utility
 * Uses browser print functionality for now
 * Can be enhanced with jsPDF or html2pdf later
 */

export function exportResumeToPDF(markdown: string, resumeData: any) {
  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups for this site.");
  }

  // Convert markdown to HTML
  const html = markdownToHTML(markdown);

  // Create print-friendly HTML
  const printHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Resume - ${resumeData.header?.fullName || "Resume"}</title>
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0;
          }
          h1 {
            font-size: 24pt;
            font-weight: bold;
            margin: 0 0 8pt 0;
            text-align: center;
          }
          h2 {
            font-size: 14pt;
            font-weight: bold;
            margin: 16pt 0 8pt 0;
            border-bottom: 1pt solid #000;
            padding-bottom: 4pt;
          }
          h3 {
            font-size: 12pt;
            font-weight: bold;
            margin: 12pt 0 6pt 0;
          }
          p {
            margin: 6pt 0;
            text-align: justify;
          }
          ul {
            margin: 6pt 0;
            padding-left: 20pt;
          }
          li {
            margin: 4pt 0;
          }
          strong {
            font-weight: bold;
          }
          em {
            font-style: italic;
          }
          .contact-info {
            text-align: center;
            margin: 8pt 0 16pt 0;
            font-size: 10pt;
          }
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  printWindow.document.write(printHTML);
  printWindow.document.close();

  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
    // Close window after printing (optional)
    // printWindow.close();
  }, 250);
}

function markdownToHTML(md: string): string {
  let html = md;

  // Headers
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");

  // Lists
  html = html.replace(/^\- (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // Paragraphs (lines that aren't headers or lists)
  html = html.split("\n").map((line) => {
    if (
      line.trim() &&
      !line.startsWith("#") &&
      !line.startsWith("-") &&
      !line.startsWith("<")
    ) {
      return `<p>${line}</p>`;
    }
    return line;
  }).join("\n");

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/gim, "");

  // Replace multiple newlines with single
  html = html.replace(/\n{3,}/gim, "\n\n");

  return html;
}
















