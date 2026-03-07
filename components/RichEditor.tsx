'use client';

import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// 动态导入 ReactQuill，禁用 SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false }) as any;

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

export default function RichEditor({ value, onChange }: RichEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        className="flex-1 overflow-hidden flex flex-col"
        // 自定义样式以适应全高度
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      />
      <style jsx global>{`
        // 专业简历样式覆盖
        .ql-container {
          flex: 1;
          overflow-y: auto;
          font-family: 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif; /* 无衬线字体 */
          font-size: 14px;
          line-height: 1.6;
          color: #333;
        }
        
        .ql-editor {
          min-height: 100%;
          padding: 40px 60px; /* 模拟 A4 纸边距 */
          background-color: #fff;
          max-width: 850px; /* 限制最大宽度，类似 A4 纸 */
          margin: 0 auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        /* 简历大标题 H1 */
        .ql-editor h1 {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
          color: #000;
        }

        /* 模块标题 H2 */
        .ql-editor h2 {
          font-size: 18px;
          font-weight: bold;
          border-bottom: 1px solid #e5e7eb; /* 浅色分割线 */
          padding-bottom: 6px;
          margin-top: 24px;
          margin-bottom: 12px;
          color: #1f2937;
        }

        /* 列表样式 */
        .ql-editor ul, .ql-editor ol {
          padding-left: 20px;
          margin-bottom: 12px;
        }

        .ql-editor li {
          margin-bottom: 4px; /* 紧凑行距 */
        }

        .ql-editor p {
          margin-bottom: 8px;
        }

        /* 强调文字 */
        .ql-editor strong {
          font-weight: 600;
          color: #000;
        }
      `}</style>
    </div>
  );
}
