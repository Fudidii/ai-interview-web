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

  const baseURL = 'https://api.deepseek.com/v1'; // 可根据需要修改为智谱或其他

  const openai = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: baseURL,
  });

  try {
    const { question, userAnswer, resumeText, jdText, targetCompany } = await req.json();

    const systemPrompt = `你是一位金牌面试辅导导师。请根据【面试官的问题】和【用户的原始回答】，给出一份润色后的完美答案。

【输出格式与约束】：
- 口吻：必须是可直接用于真实面试的第一人称口吻，简洁、自洽、信息密度高，像现场回答。
- 字数：≤ 500 字，绝对不要扩写成小作文。
- 强制框架：
  - 简历题：严格使用 STAR (情境-任务-行动-结果) 或 SCQA 框架。
  - 业务题：遵循 问题-原因-方案-权衡-指标-风险兜底 框架。
  - 行业题：遵循 趋势-影响-应对 或 观点-论据-总结 框架。
- 禁止编造：严格基于用户提供的信息进行重组！绝对不要编造数据、结论或项目背景！
- 占位符：如果用户的回答缺失了核心逻辑的支撑细节，请使用【待补：xxx】占位提示用户，且只补最关键的 1-2 个点。

【上下文信息】：
${resumeText ? `候选人简历内容：\n${resumeText.slice(0, 2000)}\n` : ''}
${jdText ? `目标岗位 JD：\n${jdText.slice(0, 1000)}\n` : ''}
${targetCompany ? `目标公司：${targetCompany}\n（请在润色时，尝试结合该公司的业务特点或产品风格进行优化）\n` : ''}
`;

    const userPrompt = `
    面试官的问题：${question}
    
    用户的原始回答：${userAnswer}
    `;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
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
    console.error('Polisher API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
