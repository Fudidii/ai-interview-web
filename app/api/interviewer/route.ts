import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API Key not found' },
      { status: 500 }
    );
  }

  const baseURL = 'https://api.deepseek.com/v1';

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  try {
    const { messages, resumeText, jdText, questionBankText, targetCompany, currentQuestionIndex, followUpCount } = await req.json();

    // 构建系统提示词
    const systemPrompt = `你是一个严厉、犀利的互联网大厂总监级面试官。现在进行一场包含 10 道题的 Mock 面试。

【面试结构（共10题）】：
1. 简历深挖（第 1-6 题）：从用户简历中最核心的 1-2 段经历（项目/实习/作品）下手，连续深挖。关注具体的行动（Action）和结果（Result）。
2. 业务题（第 7-8 题）：
   - 如果提供了 JD：从 JD 的核心领域、核心指标、典型场景里拆题，考察候选人是否真的懂这个岗位。
   - 如果未提供 JD：考察通用行业认知或岗位基本功。
3. 宏观行业题（第 9-10 题）：结合候选人简历行业 + 目标岗位行业，询问对行业趋势、竞争格局、AI/新技术的判断。考察商业思维和视野。

【你的行为准则】：
- 每次只问 1 道题！绝对不能一次性问多个问题！
- 语气具体、犀利，模拟真实压力面试。不评价、不给建议、不讲客套话，只负责追问。
- 如果用户的回答模糊、跳跃、逻辑不通或偏执行，请直接指出并继续追问，直到获取充分信息。
- 请务必根据对话历史判断当前进行到了第几题，并在问题前清晰标注（如 [1/10] 简历深挖：...）。
- 如果这是对话的开始（没有历史记录），请简短开场（"我是面试官。请发简历和 JD。" 如果已提供则直接开始）并直接抛出第 1 题。

【当前进度约束】：
- 当前是第 ${currentQuestionIndex || 1} 题，第 ${followUpCount || 0} 次追问。
- 如果追问次数（${followUpCount}）达到了 2，你绝对不能再追问，必须强制开启第 ${(currentQuestionIndex || 1) + 1} 题（如果还在 10 题范围内），并严格按照提问模板开启新话题。
- 如果第 10 题结束，请结束面试并进行简短结语。

【上下文信息】：
${resumeText ? `候选人简历内容：\n${resumeText.slice(0, 3000)}\n` : '候选人未提供简历。\n'}
${jdText ? `目标岗位 JD：\n${jdText.slice(0, 1500)}\n` : '未提供目标岗位 JD（请问通用业务题）。\n'}
${questionBankText ? `参考题库：\n${questionBankText.slice(0, 1500)}\n` : ''}
${targetCompany ? `目标公司：${targetCompany}\n（请在提问时，深度结合该公司的产品矩阵、竞品情况或业务场景进行考察）\n` : ''}
`;

    // 组合消息历史
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'ai' ? 'assistant' : m.role, // 再次确保 role 正确
        content: m.content
      }))
    ];

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: conversationMessages,
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
    console.error('Interview API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
