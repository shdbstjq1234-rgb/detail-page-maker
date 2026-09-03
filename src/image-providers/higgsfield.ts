import type { ImageProvider, ImageGenRequest, ImageGenResult } from "./types";
import { ratioToSize } from "./types";

/**
 * Higgsfield 어댑터.
 *
 * Higgsfield 는 보통 비동기 잡(job) 방식이다: 생성 요청 → job id → 폴링 → 결과.
 * HIGGSFIELD_API_URL 문서에 맞춰 경로/필드명을 조정한다.
 */
export class HiggsfieldProvider implements ImageProvider {
  readonly name = "higgsfield" as const;
  private apiKey: string;
  private baseUrl: string;
  private pollIntervalMs = 2500;
  private maxPollMs = 90_000;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || "https://api.higgsfield.ai/v1").replace(/\/$/, "");
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async generate(req: ImageGenRequest): Promise<ImageGenResult[]> {
    const { width, height } = ratioToSize(req.aspectRatio);

    const start = await fetch(`${this.baseUrl}/image/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        reference_image_url: req.referenceImageUrl,
        num_images: req.count,
        width,
        height,
        seed: req.seed,
      }),
    });
    if (!start.ok) {
      const body = await start.text().catch(() => "");
      throw new Error(`Higgsfield start ${start.status}: ${body.slice(0, 300)}`);
    }
    const startData = (await start.json()) as { id?: string; job_id?: string };
    const jobId = startData.id ?? startData.job_id;
    if (!jobId) throw new Error("Higgsfield: job id 를 받지 못했습니다");

    const deadline = Date.now() + this.maxPollMs;
    while (Date.now() < deadline) {
      await sleep(this.pollIntervalMs);
      const poll = await fetch(`${this.baseUrl}/image/jobs/${jobId}`, {
        headers: this.headers(),
      });
      if (!poll.ok) continue;
      const job = (await poll.json()) as HiggsfieldJob;

      if (job.status === "completed" || job.status === "succeeded") {
        const items = job.results ?? job.images ?? [];
        return items.slice(0, req.count).map((it, i) => ({
          url: it.url ?? "",
          width,
          height,
          seed: it.seed ?? (req.seed ? req.seed + i : undefined),
          raw: it,
        }));
      }
      if (job.status === "failed" || job.status === "error") {
        throw new Error(`Higgsfield job 실패: ${job.error ?? "unknown"}`);
      }
    }
    throw new Error("Higgsfield: 폴링 타임아웃");
  }
}

interface HiggsfieldJob {
  status: string;
  error?: string;
  results?: HiggsfieldImage[];
  images?: HiggsfieldImage[];
}
interface HiggsfieldImage {
  url?: string;
  seed?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
