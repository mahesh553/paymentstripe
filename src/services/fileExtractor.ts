import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const result = event.target?.result;
      
      if (!result) {
        reject(new Error('Failed to read file'));
        return;
      }

      try {
        let text = '';
        
        if (file.type === 'text/plain') {
          text = result as string;
        } else if (file.type === 'application/pdf') {
          try {
            const arrayBuffer = result as ArrayBuffer;
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const textParts: string[] = [];
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
              textParts.push(pageText);
            }
            
            text = textParts.join('\n\n');
          } catch (pdfError) {
            console.error('PDF extraction error:', pdfError);
            text = 'Unable to extract text from PDF. Please ensure the PDF contains selectable text.';
          }
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          try {
            const arrayBuffer = result as ArrayBuffer;
            const docxResult = await mammoth.extractRawText({ arrayBuffer });
            text = docxResult.value;
          } catch (docxError) {
            console.error('DOCX extraction error:', docxError);
            text = 'Unable to extract text from DOCX file.';
          }
        } else {
          // Try to read as text
          text = result as string;
        }
        
        if (!text || text.trim().length === 0) {
          reject(new Error('No text content found in the file'));
          return;
        }
        
        resolve(text);
      } catch (error) {
        reject(new Error(`Failed to extract text from ${file.type} file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload PDF, DOCX, or TXT files.'
    };
  }
  
  return { valid: true };
};