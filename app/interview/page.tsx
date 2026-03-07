'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Mic, Send, Bot, User, FileText, FileQuestion, Briefcase, StopCircle, X } from 'lucide-react';
import { parseFile } from '@/lib/file-parser';
import ReactMarkdown from 'react-markdown';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

type Message = {
  role: 'user' | 'ai';
  content: string;
};

export default function InterviewPage() {
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '你好！我是你的 AI 面试官。请上传简历、JD 和题库（可选），然后我们可以开始模拟面试。' }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [questionBankText, setQuestionBankText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // V3.0 新增状态
  const [targetCompany, setTargetCompany] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 0表示未开始，1-10表示第几题
  const [followUpCount, setFollowUpCount] = useState(0); // 当前题目的追问次数 0-2

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [questionBankFile, setQuestionBankFile] = useState<File | null>(null);

  // 自动滚动到底部
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化加载第一题
  const hasInitialized = useRef(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const startInterview = async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    setIsAiThinking(true);
    setCurrentQuestionIndex(1); // 开始第一题
    setFollowUpCount(0);
    
    try {
      // 构造初始消息请求第一题
      const response = await fetch('/api/interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 确保 role 是 assistant
          messages: [], 
          resumeText,
          jdText,
          questionBankText,
          targetCompany, // 传递目标公司
          currentQuestionIndex: 1, // 初始为1
          followUpCount: 0
        }),
      });

      if (!response.ok) throw new Error('API error');

      const reader = response.body?.getReader();
      if (!reader) return;

      let aiResponse = '';
      // 更新第一条欢迎消息或添加新消息
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs.length === 1 && newMsgs[0].content.includes('你好！我是你的 AI 面试官')) {
           newMsgs[0].content = ''; // 清空默认欢迎语，准备接收实时流
           return newMsgs;
        }
        return [...prev, { role: 'ai', content: '' }];
      });

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = aiResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Init interview error:', error);
    } finally {
      setIsInitializing(false);
      setIsAiThinking(false);
    }
  };

  // 当文件上传完成后（或用户直接点击开始），可以手动触发
  // 这里为了演示，我们加一个“开始面试”按钮在顶部，或者在文件上传后自动触发
  // 简化起见，我们增加一个显式的“开始面试”按钮

  // ... (existing code)
  // 语音识别引用
  const recognitionRef = useRef<any>(null);

  // 初始化语音识别
  // 注意：Web Speech API 要求使用 HTTPS 协议或 localhost 环境才能正常工作
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Browser does not support Speech Recognition');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;

      // 状态监听
      recognition.onstart = () => {
        setIsRecording(true);
        console.log('Speech recognition started');
      };

      recognition.onend = () => {
        setIsRecording(false);
        console.log('Speech recognition ended');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // 实时更新输入框：追加新识别的内容到现有输入
        // 注意：这里简单处理为追加，实际可能需要更复杂的逻辑来处理 interim
        if (finalTranscript || interimTranscript) {
             setInput(prev => {
                // 如果是 interim，可能会重复追加，所以这里简化为只追加 final
                // 为了更好的体验，通常 input 显示的是 "已确认文本 + 正在识别文本"
                // 但这里 setInput 是受控组件，频繁更新可能导致光标跳动
                // 简化方案：只处理 final，或者每次全量更新（如果 continuous=true 从0开始遍历）
                
                // 方案二：全量更新（更稳定）
                let fullTranscript = '';
                for (let i = 0; i < event.results.length; ++i) {
                    fullTranscript += event.results[i][0].transcript;
                }
                return fullTranscript;
             });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        
        const isChrome = navigator.userAgent.includes('Chrome');
        const isEdge = navigator.userAgent.includes('Edg');
        const browserName = isEdge ? 'Microsoft Edge' : (isChrome ? 'Google Chrome' : '当前浏览器');

        if (event.error === 'not-allowed') {
          alert('无法访问麦克风。请检查浏览器权限设置。\n注意：Web Speech API 需要 HTTPS 环境或 localhost。');
        } else if (event.error === 'no-speech') {
          // 忽略无语音错误，通常是因为静音自动停止
        } else if (event.error === 'network') {
          const vpnTip = isChrome ? '1. 尝试开启 VPN (科学上网) 并确保代理了浏览器流量\n' : '';
          alert(`语音识别网络错误 (${browserName})。\n\n这通常是因为无法连接到云端语音服务。\n\n建议方案：\n${vpnTip}2. 尝试使用 Microsoft Edge 浏览器 (通常不需要 VPN)\n3. 检查网络连接是否正常\n4. 暂时使用键盘输入`);
        } else {
          alert(`语音识别错误: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别，请使用 Chrome 或 Edge。');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput(''); // 开始新录音前清空，避免混淆
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        // 如果已经开始，可能会报错，忽略
      }
    }
  };

  const [isPolishing, setIsPolishing] = useState(false);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState('');

  const downloadWordReport = async () => {
    if (!report) return;

    // 简单的解析 markdown 到 docx (简化版，实际可能需要更复杂的解析)
    // 这里我们直接把 report 文本分段放入 word
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `面试复盘报告 - ${targetCompany || '未指定公司'}`,
                bold: true,
                size: 32,
              }),
            ],
            spacing: { after: 400 },
          }),
          ...report.split('\n').map(line => new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24,
              }),
            ],
          })),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `面试复盘报告-${new Date().toISOString().split('T')[0]}.docx`);
  };

  const generateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    setMessages(prev => [...prev, { role: 'ai', content: '📝 正在为您生成完美面试逐字稿，请稍候...' }]);

    try {
      // 强制转换 role: ai -> assistant
      const sanitizedMessages = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content
      }));

      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: sanitizedMessages }),
      });

      if (!response.ok) throw new Error('Report API error');

      const reader = response.body?.getReader();
      if (!reader) return;

      let reportContent = '';
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        reportContent += chunk;
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.content.startsWith('📝 正在') || lastMsg.content.startsWith('## 完美面试')) {
             lastMsg.content = reportContent;
          }
          return newMessages;
        });
      }
      setReport(reportContent);

    } catch (error) {
      console.error('Report error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: '生成报告失败，请重试。' }]);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isAiThinking || isPolishing) return;

    const userMessage = input.trim();
    // 1. 用户发送消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsRecording(false);
    recognitionRef.current?.stop();
    
    // 2. 调用润色 API (导师介入)
    setIsPolishing(true);
    let polishedAnswer = '';
    
    try {
      // 获取最后一个 AI 问题 (面试官的问题)
      const lastAiMessage = messages.slice().reverse().find(m => m.role === 'ai');
      const question = lastAiMessage ? lastAiMessage.content : '请自我介绍';

      setMessages(prev => [...prev, { role: 'ai', content: '💡 导师正在润色你的回答...' }]); // 导师占位

      const polisherResponse = await fetch('/api/polisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          userAnswer: userMessage,
          resumeText,
          jdText
        }),
      });

      if (!polisherResponse.ok) throw new Error('Polisher API error');

      const reader = polisherResponse.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        polishedAnswer += chunk;
        
        // 实时更新导师建议
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.content.startsWith('💡 导师正在')) {
             lastMsg.content = `💡 **金牌导师润色建议**：\n\n${polishedAnswer}`;
          } else {
             lastMsg.content = `💡 **金牌导师润色建议**：\n\n${polishedAnswer}`;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Polisher error:', error);
      // 如果润色失败，不阻断流程，直接继续
      setMessages(prev => prev.filter(m => !m.content.startsWith('💡 导师')));
    } finally {
      setIsPolishing(false);
    }

    // 3. 调用面试官 API (生成下一个问题)
    setIsAiThinking(true);
    
    // 计算新的题目进度
    let nextQuestionIndex = currentQuestionIndex;
    let nextFollowUpCount = followUpCount + 1;

    // 如果追问次数达到2次，强制进入下一题
    if (nextFollowUpCount > 2) {
        nextQuestionIndex += 1;
        nextFollowUpCount = 0;
    }
    
    // 更新状态
    setCurrentQuestionIndex(nextQuestionIndex);
    setFollowUpCount(nextFollowUpCount);

    try {
      const response = await fetch('/api/interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 强制转换 role: ai -> assistant
          messages: messages.concat({ role: 'user', content: userMessage }).map(m => ({
            role: m.role === 'ai' ? 'assistant' : m.role,
            content: m.content
          })),
          resumeText,
          jdText,
          questionBankText,
          targetCompany,
          currentQuestionIndex: nextQuestionIndex,
          followUpCount: nextFollowUpCount
        }),
      });

      if (!response.ok) throw new Error('Interviewer API error');

      const reader = response.body?.getReader();
      if (!reader) return;

      let aiResponse = '';
      setMessages(prev => [...prev, { role: 'ai', content: '' }]); // 面试官占位

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = aiResponse;
          return newMessages;
        });
      }

    } catch (error) {
      console.error('Interviewer error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: '（面试官掉线了，请重试）' }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'jd' | 'question') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'resume') setResumeFile(file);
      if (type === 'jd') setJdFile(file);
      if (type === 'question') setQuestionBankFile(file);

      const text = await parseFile(file);
      
      if (type === 'resume') setResumeText(text);
      if (type === 'jd') setJdText(text);
      if (type === 'question') setQuestionBankText(text);
      
      setMessages(prev => [...prev, { role: 'ai', content: `已接收并解析文件：${file.name}` }]);
    } catch (error) {
      console.error('File upload error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: `文件解析失败：${file.name}` }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部：文件上传区 */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          AI 模拟面试
        </h1>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex flex-wrap gap-4 items-center">
            <UploadButton 
              label="上传简历" 
              icon={<FileText className="w-4 h-4" />} 
              file={resumeFile} 
              onChange={(e) => handleFileUpload(e, 'resume')} 
            />
            {/* JD 输入改为 Textarea，更方便粘贴 */}
            <div className="relative group">
              <textarea
                placeholder="在此粘贴 JD (可选)"
                className="w-48 h-[38px] px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none overflow-hidden"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                style={{ paddingTop: '8px' }}
              />
            </div>
            {/* V3.0 新增：目标公司输入框 */}
            <div className="relative group">
              <input
                type="text"
                placeholder="目标公司 (选填)"
                className="w-36 h-[38px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
              />
            </div>
            <UploadButton 
              label="参考题库 (可选)" 
              icon={<FileQuestion className="w-4 h-4" />} 
              file={questionBankFile} 
              onChange={(e) => handleFileUpload(e, 'question')} 
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={generateReport}
              disabled={messages.length < 5 || isGeneratingReport} // 至少有几轮对话才生成
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-1"
            >
              <FileText className="w-4 h-4" /> 生成逐字稿
            </button>
            {report && (
              <button
                onClick={downloadWordReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm flex items-center gap-1"
              >
                <FileText className="w-4 h-4" /> 下载 Word
              </button>
            )}
            <button
              onClick={startInterview}
              disabled={isInitializing || isAiThinking || !resumeFile}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isInitializing ? '启动中...' : '开始面试'}
            </button>
          </div>
        </div>
      </div>

      {/* 中间：聊天记录区 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : msg.content.startsWith('💡') 
                    ? 'bg-yellow-50 text-gray-800 border border-yellow-200 rounded-tl-none' // 导师建议样式
                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none' // 面试官样式
              }`}>
                {msg.content.startsWith('💡') ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部：输入区 */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <button
            onClick={toggleRecording}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="按住说话"
          >
            {isRecording ? <StopCircle className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <div className="flex-1 bg-gray-100 rounded-xl p-2 flex items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "正在听..." : "输入消息..."}
              className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm px-2 outline-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!input.trim()}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {isRecording && (
          <p className="text-center text-xs text-red-500 mt-2 animate-pulse">正在录音中...</p>
        )}
      </div>
    </div>
  );
}

// 辅助组件：文件上传按钮
function UploadButton({ label, icon, file, onChange }: { 
  label: string; 
  icon: React.ReactNode; 
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative group">
      <input 
        type="file" 
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        accept=".pdf,.docx,.txt"
      />
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
        file 
          ? 'bg-blue-50 border-blue-200 text-blue-700' 
          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
      }`}>
        {icon}
        <span className="truncate max-w-[100px]">{file ? file.name : label}</span>
        {file && <span className="ml-1 text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">已上传</span>}
      </div>
    </div>
  );
}
