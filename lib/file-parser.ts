import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 设置 PDF.js worker
// 注意：在 Next.js 中，我们需要指向 CDN 或者本地 public 目录下的 worker 文件
// 这里使用 CDN 方式，确保版本匹配
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export const parseFile = async (file: File): Promise<string> => {
  const fileType = file.type;

  try {
    if (fileType === 'application/pdf') {
      return await parsePDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.endsWith('.docx')
    ) {
      return await parseWord(file);
    } else {
      throw new Error('不支持的文件格式，请上传 PDF 或 Word (.docx)');
    }
  } catch (error) {
    console.error('解析文件失败:', error);
    throw error;
  }
};

const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
};

const parseWord = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};
