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
      { error: 'API Key not found in environment variables' },
      { status: 500 }
    );
  }

  // 默认配置为 DeepSeek API，用户可根据需要自行修改 baseURL
  const baseURL = 'https://api.deepseek.com/v1'; // 如果使用智谱，请修改此处

  const openai = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: baseURL,
  });

  try {
    const { resumeText, jdText, companyName } = await req.json();

    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: 'Missing resume or JD text' },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一个资深猎头，请根据以下 JD 优化这份简历。
    目标公司：${companyName || '未指定'}
    
    请直接输出优化后的简历内容，并且必须使用 HTML 格式输出，包括适当的 <h1> <h2> <ul> 等标签，以便于在富文本编辑器中展示。
    
    要求：
    1. 针对 JD 里的关键词对简历进行针对性调整。
    2. 保持简历内容的真实性，不要编造经历，但可以优化措辞。
    3. 务必直接输出纯净的 HTML 内容，绝对不要在开头和结尾使用 markdown 的代码块标记（如 \`\`\`html），必须使用结构化的标签（<h1> <h2> <ul> <li> <p> 等）进行专业简历排版，确保结构清晰。
    4. 重点突出与 JD 匹配的技能和项目经验。
    `;

    const userPrompt = `
    岗位 JD：
    ${jdText}

    原始简历：
    ${resumeText}
    `;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat', // 默认模型
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true, // 开启流式输出，提升用户体验（如果前端支持）
    });

    // 创建一个流式响应
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
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
