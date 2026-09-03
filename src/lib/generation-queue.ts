/**
 * 이미지 생성 큐.
 * API 를 동시에 무제한 호출하지 않고 concurrency 만큼만 굴린다. 실패 시 재시도.
 */

export interface QueueTask<T> {
  id: string;
  run: (signal: AbortSignal) => Promise<T>;
}

export interface QueueEvent<T> {
  id: string;
  status: "start" | "done" | "error" | "retry";
  result?: T;
  error?: string;
  attempt: number;
  /** 완료 수 / 전체 수 */
  done: number;
  total: number;
}

export interface QueueOptions<T> {
  concurrency?: number;
  retries?: number;
  onEvent?: (e: QueueEvent<T>) => void;
  signal?: AbortSignal;
}

export interface QueueResult<T> {
  id: string;
  ok: boolean;
  result?: T;
  error?: string;
}

/** 동시 실행 수를 제한해 순차적으로 소비한다 */
export async function runQueue<T>(tasks: QueueTask<T>[], opts: QueueOptions<T> = {}): Promise<QueueResult<T>[]> {
  const concurrency = Math.max(1, Math.min(opts.concurrency ?? 3, 6));
  const retries = opts.retries ?? 1;
  const total = tasks.length;
  const results: QueueResult<T>[] = new Array(total);
  const ac = new AbortController();
  if (opts.signal) {
    if (opts.signal.aborted) ac.abort();
    else opts.signal.addEventListener("abort", () => ac.abort(), { once: true });
  }

  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < total) {
      if (ac.signal.aborted) return;
      const i = cursor++;
      const task = tasks[i];
      let attempt = 0;
      for (;;) {
        attempt++;
        opts.onEvent?.({ id: task.id, status: attempt === 1 ? "start" : "retry", attempt, done, total });
        try {
          const result = await task.run(ac.signal);
          done++;
          results[i] = { id: task.id, ok: true, result };
          opts.onEvent?.({ id: task.id, status: "done", result, attempt, done, total });
          break;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (attempt > retries || ac.signal.aborted) {
            done++;
            results[i] = { id: task.id, ok: false, error: msg };
            opts.onEvent?.({ id: task.id, status: "error", error: msg, attempt, done, total });
            break;
          }
          // 짧게 쉬고 재시도
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return results.filter(Boolean);
}
