/**
 * AnalysisService — Provider-agnostic AI video analysis.
 *
 * How to add a new AI model:
 *  1. Create a class that implements VideoAnalysisProvider (in ./providers/)
 *  2. Register it in AnalysisService.registerProvider()
 *  3. Set NEXT_PUBLIC_VIDEO_ANALYSIS_PROVIDER=your-provider-name in .env
 *
 * Current providers:
 *  - 'stub'    — returns empty result (default, safe for dev/prod before model is ready)
 *  - 'gemini'  — Google Gemini 1.5 Pro Vision (plug in when ready)
 */

import type {
  VideoAnalysisProvider,
  VideoAnalysisInput,
  VideoAnalysisResult,
} from './types';
import { videoService } from './video-service';

// ──────────────────────────────────────────────
// Stub provider (safe no-op, always ready)
// ──────────────────────────────────────────────

class StubAnalysisProvider implements VideoAnalysisProvider {
  readonly name = 'stub';
  readonly version = '1.0';
  readonly isAsync = false;

  async analyze(_input: VideoAnalysisInput): Promise<VideoAnalysisResult> {
    // Returns empty result — replace with real model call
    return {
      overallScore: undefined,
      contentSafe: true,
      videoQuality: 'medium',
      rawOutput: { provider: 'stub', message: 'No analysis provider configured' },
      processingTimeMs: 0,
    };
  }
}

// ──────────────────────────────────────────────
// Gemini provider (ready to implement)
// ──────────────────────────────────────────────

class GeminiAnalysisProvider implements VideoAnalysisProvider {
  readonly name = 'gemini';
  readonly version = '1.5-pro';
  readonly isAsync = false;

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyze(input: VideoAnalysisInput): Promise<VideoAnalysisResult> {
    const start = Date.now();

    // ── Build Gemini prompt ──────────────────────────────────────────────────
    const prompt = `
You are an expert football (soccer) scout and performance analyst.
Analyze this football video and return a structured JSON assessment.

Video details:
- Player ID: ${input.playerId}
- Category: ${input.metadata?.category ?? 'unknown'}
- Title: ${input.metadata?.title ?? 'Football video'}

Analyze and return JSON with this exact structure (use null for fields you cannot assess):
{
  "overallScore": <0-100 integer>,
  "playerDetected": <true/false>,
  "estimatedAge": <integer or null>,
  "dominantFoot": <"left"|"right"|"both"|null>,
  "position": <detected position string or null>,
  "skillScores": {
    "pace": <0-100 or null>,
    "dribbling": <0-100 or null>,
    "shooting": <0-100 or null>,
    "passing": <0-100 or null>,
    "defending": <0-100 or null>,
    "heading": <0-100 or null>,
    "firstTouch": <0-100 or null>,
    "vision": <0-100 or null>
  },
  "highlights": [
    { "timestampSec": <number>, "duration": <number>, "label": <string>, "confidence": <0-1> }
  ],
  "contentSafe": <true/false>,
  "contentFlags": [],
  "videoQuality": <"low"|"medium"|"high">,
  "hasAudio": <true/false>,
  "lightingQuality": <"poor"|"fair"|"good">
}
Return only valid JSON, no markdown.
    `.trim();

    // ── Call Gemini API ──────────────────────────────────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  fileData: {
                    mimeType: input.metadata?.mimeType ?? 'video/mp4',
                    fileUri: input.videoUrl,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${err}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Gemini returned non-JSON: ${text}`);
    }

    return {
      overallScore: parsed.overallScore as number | undefined,
      playerDetected: parsed.playerDetected as boolean | undefined,
      estimatedAge: parsed.estimatedAge as number | undefined,
      dominantFoot: parsed.dominantFoot as VideoAnalysisResult['dominantFoot'],
      position: parsed.position as string | undefined,
      skillScores: parsed.skillScores as VideoAnalysisResult['skillScores'],
      highlights: parsed.highlights as VideoAnalysisResult['highlights'],
      contentSafe: parsed.contentSafe as boolean | undefined,
      contentFlags: parsed.contentFlags as string[] | undefined,
      videoQuality: parsed.videoQuality as VideoAnalysisResult['videoQuality'],
      hasAudio: parsed.hasAudio as boolean | undefined,
      lightingQuality: parsed.lightingQuality as VideoAnalysisResult['lightingQuality'],
      rawOutput: parsed,
      processingTimeMs: Date.now() - start,
    };
  }
}

// ──────────────────────────────────────────────
// AnalysisService
// ──────────────────────────────────────────────

export class AnalysisService {
  private providers = new Map<string, VideoAnalysisProvider>();
  private activeProviderName: string;

  constructor() {
    // Register built-in providers
    this.providers.set('stub', new StubAnalysisProvider());

    const geminiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (geminiKey) {
      this.providers.set('gemini', new GeminiAnalysisProvider(geminiKey));
    }

    // Active provider from env, default to stub
    this.activeProviderName =
      process.env.NEXT_PUBLIC_VIDEO_ANALYSIS_PROVIDER ?? 'stub';
  }

  // ── Provider management ────────────────────────────────────────────────────

  registerProvider(provider: VideoAnalysisProvider): void {
    this.providers.set(provider.name, provider);
  }

  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Analysis provider "${name}" is not registered`);
    }
    this.activeProviderName = name;
  }

  getActiveProvider(): VideoAnalysisProvider {
    return this.providers.get(this.activeProviderName) ?? this.providers.get('stub')!;
  }

  isReady(): boolean {
    return this.activeProviderName !== 'stub';
  }

  // ── Analyze a single video ─────────────────────────────────────────────────

  async analyzeVideo(videoId: string): Promise<VideoAnalysisResult> {
    const video = await videoService.getById(videoId);
    if (!video) throw new Error(`Video not found: ${videoId}`);

    // Mark as processing
    await videoService.saveAnalysisResult(
      videoId,
      { rawOutput: { status: 'starting' } },
      this.activeProviderName,
      this.getActiveProvider().version,
      'failed' // will be updated to completed below
    );

    const provider = this.getActiveProvider();

    try {
      await supabaseUpdateStatus(videoId, 'processing');

      const result = await provider.analyze({
        videoId: video.id,
        videoUrl: video.videoUrl,
        storagePath: video.storagePath,
        playerId: video.playerId,
        metadata: {
          title: video.title,
          description: video.description,
          category: video.category,
          duration: video.duration,
          mimeType: video.mimeType,
        },
      });

      await videoService.saveAnalysisResult(
        videoId,
        result,
        provider.name,
        provider.version,
        'completed'
      );

      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await videoService.saveAnalysisResult(
        videoId,
        { error: errMsg, rawOutput: { error: errMsg } },
        provider.name,
        provider.version,
        'failed'
      );
      throw err;
    }
  }

  // ── Process the analysis queue ─────────────────────────────────────────────

  async processQueue(batchSize = 5): Promise<{ processed: number; failed: number }> {
    const queued = await videoService.getQueuedVideos(batchSize);
    let processed = 0;
    let failed = 0;

    for (const video of queued) {
      try {
        await this.analyzeVideo(video.id);
        processed++;
      } catch (err) {
        console.error(`[AnalysisService] Failed to analyze video ${video.id}:`, err);
        failed++;
      }
    }

    return { processed, failed };
  }
}

// ── Supabase helper (avoids circular imports) ──────────────────────────────

async function supabaseUpdateStatus(videoId: string, status: string) {
  const { supabase } = await import('@/lib/supabase/config');
  await supabase
    .from('player_videos')
    .update({ analysisStatus: status, updatedAt: new Date().toISOString() })
    .eq('id', videoId);
}

// Singleton
export const analysisService = new AnalysisService();
