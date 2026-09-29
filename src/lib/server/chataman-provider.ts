import 'server-only';

export interface ChatAmanConfig {
  apiKey: string;
  baseUrl: string;
}

function getBaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'chataman.com' && !url.hostname.endsWith('.chataman.com')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function sendChatAmanTemplate(
  payload: unknown,
  config: ChatAmanConfig,
): Promise<boolean> {
  const baseUrl = getBaseUrl(config.baseUrl);
  const apiKey = String(config.apiKey || '').trim();
  if (!baseUrl || !apiKey || !payload) return false;

  try {
    const response = await fetch(`${baseUrl}/api/send/template`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    if (!data) return true;
    return data.status !== 'error' && data.success !== false && data?.data?.success !== false;
  } catch (error) {
    console.error('[chataman-provider] send template failed:', error);
    return false;
  }
}
