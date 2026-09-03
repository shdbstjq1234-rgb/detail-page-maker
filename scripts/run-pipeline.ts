/**
 * CLI 로 파이프라인 실행:
 *   npm run pipeline -- ./examples/product.json
 *   npm run pipeline               (인자 없으면 내장 샘플)
 *
 * 결과 DetailPage JSON 을 stdout 으로 출력한다.
 */
import { readFileSync } from "node:fs";
import { runPipeline } from "../src/ai/pipeline";
import { analyzeReferenceUrls } from "../src/ai/referenceAnalyzer";
import type { ProductInput } from "../src/types/detail-page";

const SAMPLE: ProductInput = {
  name: "무선 핸디 가습기",
  category: "생활가전/가습기",
  price: 29900,
  description: "USB 충전, 300ml, 저소음, 무드등 겸용.",
  specs: ["300ml", "USB-C 충전", "최대 8시간", "28dB 저소음", "7색 무드등"],
  sellingPoints: ["선 없이 어디서나", "책상 공간 절약", "세척만으로 관리"],
  brandTone: "깔끔하고 실용적인",
};

async function main() {
  const file = process.argv[2];
  const input: ProductInput = file
    ? (JSON.parse(readFileSync(file, "utf8")) as ProductInput)
    : SAMPLE;

  const page = await runPipeline(input, {
    analyzeReferences: analyzeReferenceUrls,
    onEvent: (e) =>
      process.stderr.write(
        `${e.status === "success" ? "✓" : e.status === "error" ? "✕" : "…"} [${e.stage}] ${e.message}\n`,
      ),
  });

  process.stdout.write(JSON.stringify(page, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
