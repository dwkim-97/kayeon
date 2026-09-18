// @vitest-environment node
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {POST} from './route';
const empty = {gender:null,birthYear:null,height:null,residence:null,job:null,religion:null,mbti:null,hobbies:null,smoking:null,drinking:null,idealType:null,matchmakerComment:null,extra:null,evidence:{gender:null,birthYear:null,height:null},warnings:[]};
const request = (body: unknown) => new Request('http://localhost/api/profiles/parse', {method:'POST',body:JSON.stringify(body)});
beforeEach(() => { vi.stubEnv('GROQ_API_KEY', 'test-key'); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => {vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('profile parse API', () => {
  it('uses a strict production model schema and returns validated fields', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...empty,religion:'none',job:'교사'})}}]})));
    const response = await POST(request({text:'직업 교사 / 무교'}));
    expect(response.status).toBe(200);
    expect((await response.json()).parsed).toEqual({religion:'none',job:'교사'});
    const sent = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(sent.model).toBe('openai/gpt-oss-120b');
    expect(sent.response_format.json_schema.strict).toBe(true);
  });
  it.each([{text:[]},{text:' '},{text:'a'.repeat(12001)},null])('rejects bad input %j without calling AI', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('handles invalid model JSON safely', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'not json'}}]})));
    expect((await POST(request({text:'교사'}))).status).toBe(502);
  });
  it('does not expose provider errors or prompt text', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('private provider payload', {status:429}));
    const response = await POST(request({text:'교사'}));
    expect(response.status).toBe(429);
    expect(await response.text()).not.toContain('private provider payload');
  });
  it('returns a recoverable error when the provider times out', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('timed out','TimeoutError'));
    expect((await POST(request({text:'교사'}))).status).toBe(504);
  });
});
