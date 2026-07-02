import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are a profile parser for a Korean matchmaking service.
Extract profile information from the given Korean text and return a JSON object.

The input may use various formats: labeled (나이: 96년생), slash-separated (00/163/하나은행/잠실거주), plain sentences, or mixed.

Slash-separated format heuristics (when no labels are present):
- A 2-digit number (00~06) or 4-digit year (1990~2009) alone → birthYear (2-digit: add 2000, so "00" → 2000, "06" → 2006)
- A 3-digit number between 140 and 200 → height in cm
- A standalone MBTI string (ISFP, ENTJ, etc.) → mbti
- A Korean region/address (잠실거주, 강남, 판교 등) → residence (strip 거주 suffix)
- A company/organization/job title → job

Field mapping rules:
- gender: "female" or "male". Infer from context (이화여대 → female). Default "female".
- birthYear: 4-digit year number (e.g. 2000 for "00년생" or "00", 1996 for "96년생")
- height: integer in cm (e.g. 163)
- residence: region/address text as-is
- job: job/company/position as-is
- religion: "christian"(기독교/크리스천), "buddhist"(불교), "catholic"(천주교), "not_selected"(무교/없음 or not mentioned)
- mbti: uppercase 4-letter MBTI if mentioned
- hobbies: comma-separated hobbies
- smoking: "smoker"(흡연), "non_smoker"(비흡연), "not_selected"(not mentioned)
- drinking: "drinker"(음주), "non_drinker"(비음주), "not_selected"(not mentioned)
- idealType: ideal partner description (e.g. "비흡연자 선호" → put here)
- matchmakerComment: matchmaker notes if clearly written by a matchmaker
- extra: ALL info not fitting above — education(학력/학교/졸업/재학/전공), certificates, languages, personality, misc. Combine multiple items with newline.

Important:
- Put education in extra, NOT job.
- If a preference (e.g. "비흡연자 선호") implies something about the ideal partner, put it in idealType.
- Omit fields not mentioned.
- Return ONLY valid JSON, no explanation.`;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({message: 'GROQ_API_KEY가 설정되지 않았습니다.'}, {status: 500});
  }

  const {text} = (await request.json()) as {text: string};
  if (!text?.trim()) {
    return NextResponse.json({message: '텍스트를 입력해 주세요.'}, {status: 400});
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {role: 'system', content: SYSTEM_PROMPT},
        {role: 'user', content: text},
      ],
      temperature: 0,
      response_format: {type: 'json_object'},
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json({message: `AI 파싱 실패: ${error}`}, {status: 500});
  }

  const data = (await response.json()) as {choices: Array<{message: {content: string}}>};
  const content = data.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({message: 'AI 응답이 없습니다.'}, {status: 500});
  }

  return NextResponse.json({parsed: JSON.parse(content)});
}
