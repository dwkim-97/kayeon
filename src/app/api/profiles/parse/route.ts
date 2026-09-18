import {NextResponse} from 'next/server';
import {z} from 'zod';

import {normalizeParsedProfile, profileExtractionSchema, SYSTEM_PROMPT} from '@/lib/profiles/ai-parse';

export const runtime = 'nodejs';

const inputSchema = z.object({text: z.string().trim().min(1).max(12000)});
const responseSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.string(),
    message: z.object({content: z.string().nullable(), refusal: z.string().nullable().optional()}),
  })),
});

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({message: '프로필 텍스트를 1~12,000자로 입력해 주세요.'}, {status: 400});
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({message: 'AI 자동입력 설정을 확인해 주세요.'}, {status: 500});
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {role: 'system', content: SYSTEM_PROMPT},
          {role: 'user', content: input.data.text},
        ],
        temperature: 0,
        reasoning_effort: 'medium',
        max_completion_tokens: 8192,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'profile_extraction', strict: true,
            schema: z.toJSONSchema(profileExtractionSchema, {target: 'draft-7'}),
          },
        },
      }),
    });
    if (!response.ok) {
      return NextResponse.json({message: response.status === 429
        ? 'AI 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
        : 'AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.'}, {status: response.status === 429 ? 429 : 502});
    }
    const data = responseSchema.parse(await response.json());
    const choice = data.choices[0];
    if (!choice || choice.finish_reason !== 'stop' || choice.message.refusal || !choice.message.content) {
      return NextResponse.json({message: 'AI 분석을 완료하지 못했습니다. 내용을 확인하고 다시 시도해 주세요.'}, {status: 502});
    }
    const extraction = profileExtractionSchema.parse(JSON.parse(choice.message.content));
    return NextResponse.json(normalizeParsedProfile(extraction, input.data.text));
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({message: timeout
      ? 'AI 분석 시간이 초과되었습니다. 다시 시도해 주세요.'
      : 'AI 응답을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'}, {status: timeout ? 504 : 502});
  }
}
