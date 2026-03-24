import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let apiKey = process.env.API_KEY || '';
  if (apiKey.startsWith('API_KEY=')) {
    apiKey = apiKey.replace('API_KEY=', '');
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API Key not found' },
      { status: 500 }
    );
  }

  const baseURL = 'https://api.deepseek.com/v1';

  const openai = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: baseURL,
  });

  try {
    const { messages } = await req.json();

    const systemPrompt = `你是一位专业的面试辅导专家。请根据以下面试对话历史，为用户生成一份【完美面试逐字稿】。

【目标】：帮助用户复盘并背诵最佳回答。
【输入】：面试官的问题 + 用户的原始回答 + 之前的润色建议。
【输出要求】：
1. 输出为 Markdown 格式。
2. 提取 10 道核心面试题（忽略寒暄和无效对话）。
3. 为每一道题提供一个【标准逐字稿】（基于用户的真实经历，结合 STAR/SCQA 框架优化后的最佳回答）。
4. 逐字稿口吻必须是第一人称，自然、流畅、专业。
5. 格式如下：
   ### 第 X 题：[问题内容]
   **考察点**：[简要分析]
   **参考逐字稿**：
   [优化后的回答内容]

请直接输出 Markdown 内容，不要包含其他废话。`;

    // 过滤掉 system 消息，只保留 user 和 ai 的对话
    const conversationText = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => `${m.role === 'user' ? '候选人' : '面试官/导师'}: ${m.content}`)
      .join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下是面试记录：\n\n${conversationText}` }
      ],
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(new TextEncoder().encode(content));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('Report API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
