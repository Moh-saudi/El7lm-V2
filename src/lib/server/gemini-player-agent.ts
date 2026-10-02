type GeminiTextBlock = { type?: unknown; text?: unknown };
type GeminiStep = { type?: unknown; content?: unknown };
type GeminiResponse = { steps?: unknown };

function extractText(payload: GeminiResponse): string {
  if (!Array.isArray(payload.steps)) return '';
  for (let i = payload.steps.length - 1; i >= 0; i -= 1) {
    const step = payload.steps[i] as GeminiStep;
    if (step?.type !== 'model_output' || !Array.isArray(step.content)) continue;
    const text = (step.content as GeminiTextBlock[])
      .filter(block => block?.type === 'text' && typeof block.text === 'string')
      .map(block => String(block.text).trim())
      .filter(Boolean)
      .join('\n');
    if (text) return text.slice(0, 12000);
  }
  return '';
}

export async function askGeminiPlayerAgent(params: {
  systemInstruction: string;
  input: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
        store: false,
        system_instruction: params.systemInstruction,
        input: [{ type: 'user_input', content: params.input }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('[player-agent] Gemini status:', response.status);
      throw new Error('GEMINI_PROVIDER_ERROR');
    }

    const payload = await response.json() as GeminiResponse;
    const answer = extractText(payload);
    if (!answer) throw new Error('GEMINI_EMPTY_RESPONSE');
    return answer;
  } finally {
    clearTimeout(timeout);
  }
}
