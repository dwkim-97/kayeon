import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

type ParsedProfile = {
  gender?: 'male' | 'female';
  birthYear?: number;
  height?: number;
  residence?: string;
  job?: string;
  religion?: 'christian' | 'buddhist' | 'catholic' | 'not_selected';
  mbti?: string;
  hobbies?: string;
  smoking?: 'smoker' | 'non_smoker' | 'not_selected';
  drinking?: 'drinker' | 'non_drinker' | 'not_selected';
  idealType?: string;
  matchmakerComment?: string;
  extra?: string;
};

const SYSTEM_PROMPT = `You are a profile parser for a Korean matchmaking service.
Extract profile information from the given Korean text and return a JSON object.

Rules:
- birthYear: 4-digit year (e.g. 1996 for "96년생" or "1996년생")
- height: number in cm (e.g. 161 for "161cm" or "161")
- gender: "female" or "male" based on context clues. Default to "female" if unclear.
- religion: one of "christian"(기독교/크리스천), "buddhist"(불교), "catholic"(천주교), "not_selected"(무교/없음/미선택 or not mentioned)
- smoking: "smoker"(흡연), "non_smoker"(비흡연), "not_selected"(not mentioned)
- drinking: "drinker"(음주/마심), "non_drinker"(비음주/안마심), "not_selected"(not mentioned)
- mbti: uppercase 4-letter MBTI type if mentioned
- residence: address/region text as-is
- job: job description as-is (include school name, location, field if given)
- hobbies: comma-separated hobbies as-is
- idealType: ideal partner description as-is
- matchmakerComment: any additional notes not fitting other fields
- extra: education info or other misc info not fitting other fields
- Omit fields that are not mentioned in the text.
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

  const data = (await response.json()) as {
    choices: Array<{message: {content: string}}>;
  };

  const content = data.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({message: 'AI 응답이 없습니다.'}, {status: 500});
  }

  const parsed = JSON.parse(content) as ParsedProfile;
  return NextResponse.json({parsed});
}
