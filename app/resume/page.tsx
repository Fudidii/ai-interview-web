'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Send, Loader2, Download, MessageSquare } from 'lucide-react';
import { parseFile } from '@/lib/file-parser';
import RichEditor from '@/components/RichEditor';
// @ts-ignore
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver'; // 如果需要，可以安装 file-saver，或者用原生 blob 下载

export default function ResumeOptimizer() {
  // 状态管理
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [optimizedContent, setOptimizedContent] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai' | 'system'; content: string }[]>([
    { role: 'ai', content: '你好！我是你的简历优化助手。请先上传简历并提供目标岗位的 JD。' }
  ]);

  // 真实 API 调用
  const handleOptimize = async () => {
    if (!resumeText || !jdText) {
      alert('请确保已上传简历并填写了 JD');
      return;
    }

    setIsOptimizing(true);
    setOptimizedContent(''); // 清空旧内容
    setChatHistory(prev => [...prev, { role: 'ai', content: '正在为您优化简历，请稍候...' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          jdText,
          companyName,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      let resultText = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        resultText += chunk;
        
        // 实时清洗 Markdown 标记，确保富文本正确渲染
        // 1. 移除 ```html 和 ```
        // 2. 移除可能出现在开头的 markdown 标记
        const cleanChunk = resultText
          .replace(/^```html\s*/, '')
          .replace(/```$/, '')
          .replace(/```html/g, '')
          .replace(/```/g, '');

        setOptimizedContent(cleanChunk);
      }

      setChatHistory(prev => [...prev, { role: 'ai', content: '简历优化已完成！已根据 JD 调整了关键词和排版，请在右侧查看并编辑。' }]);

    } catch (error) {
      console.error('Optimization failed:', error);
      setChatHistory(prev => [...prev, { role: 'ai', content: '抱歉，优化过程中出现错误，请稍后重试。' }]);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 文件上传处理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await parseFile(file);
      setResumeText(text);
      setChatHistory(prev => [...prev, { role: 'system', content: `已成功解析文件：${file.name}` }]);
    } catch (error) {
      alert('文件解析失败，请重试');
    }
  };

  // 导出功能
  const exportPDF = async () => {
    if (typeof window === 'undefined') return;
    
    // 动态导入 html2pdf.js，解决 SSR 问题
    const html2pdf = (await import('html2pdf.js')).default;
    
    const element = document.createElement('div');
    element.innerHTML = optimizedContent;
    html2pdf().from(element).save('optimized-resume.pdf');
  };

  const exportWord = async () => {
    // html-docx-js 需要完整的 html 结构
    const htmlString = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Resume</title></head>
      <body>${optimizedContent}</body>
      </html>
    `;
    const buffer = await asBlob(htmlString);
    const blobUrl = URL.createObjectURL(buffer as Blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'optimized-resume.docx';
    link.click();
  };

  return (
    <div className="flex h-full w-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* 左侧：交互区 (40%) */}
      <div className="w-2/5 flex flex-col border-r border-gray-200 bg-white shadow-sm z-10">
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              简历优化智能体
            </h1>
            <p className="text-sm text-gray-500 mt-1">上传简历，一键匹配目标职位</p>
          </header>

          {/* 1. 文件上传 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">1. 上传原始简历 (PDF/Word)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors relative cursor-pointer group">
              <input 
                type="file" 
                accept=".pdf,.docx" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center text-gray-500">
                <Upload className="w-8 h-8 mb-2 group-hover:text-blue-500" />
                <span className="text-sm">{resumeText ? '文件已上传 (点击更换)' : '点击或拖拽上传文件'}</span>
              </div>
            </div>
            {resumeText && (
              <div className="text-xs text-green-600 truncate bg-green-50 p-2 rounded">
                解析成功: {resumeText.slice(0, 50)}...
              </div>
            )}
          </div>

          {/* 2. 目标信息 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">2. 填写目标信息</label>
            <input
              type="text"
              placeholder="目标公司名称 (例如：字节跳动)"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <textarea
              placeholder="请粘贴职位描述 (JD)..."
              className="w-full p-3 border rounded-md h-32 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          {/* 3. 开始优化 */}
          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !resumeText || !jdText}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isOptimizing ? <Loader2 className="animate-spin w-5 h-5" /> : '开始 AI 优化'}
          </button>
        </div>

        {/* 底部：对话框 */}
        <div className="border-t border-gray-200 bg-gray-50 flex flex-col h-64">
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700 shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t bg-white flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="输入修改意见..."
              className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput) {
                  setChatHistory(prev => [...prev, { role: 'user', content: chatInput }]);
                  setChatInput('');
                  // 可以在这里添加模拟回复
                  setTimeout(() => setChatHistory(prev => [...prev, { role: 'ai', content: '收到，正在根据您的意见微调简历...' }]), 1000);
                }
              }}
            />
            <button className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-600">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 右侧：预览与编辑区 (60%) */}
      <div className="w-3/5 flex flex-col h-full bg-gray-100">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            优化结果预览
          </h2>
          <div className="flex gap-2">
            <button onClick={exportWord} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-700">
              <Download className="w-4 h-4" /> 导出 Word
            </button>
            <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-900">
              <Download className="w-4 h-4" /> 导出 PDF
            </button>
          </div>
        </header>
        
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-lg shadow-lg h-full border border-gray-200 overflow-hidden">
             {/* 这里传入 optimizedContent */}
             <RichEditor 
               value={optimizedContent} 
               onChange={setOptimizedContent} 
             />
          </div>
        </div>
      </div>
    </div>
  );
}
