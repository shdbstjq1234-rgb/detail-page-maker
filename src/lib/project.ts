import { emptyDoc, uid, type EditorDoc } from "./editor-doc";

export interface Project {
  id: string;
  name: string;
  coverImage: string | null;
  doc: EditorDoc;
  createdAt: string;
  updatedAt: string;
}

/** doc 에서 대표 이미지(첫 상품사진 → 첫 섹션 이미지) 추출 */
export function deriveCover(doc: EditorDoc): string | null {
  const rep = (doc.product.images ?? []).find((i) => i.url)?.url;
  if (rep) return rep;
  for (const s of doc.sections) {
    const img = s.images?.find((i) => i.url)?.url;
    if (img) return img;
  }
  return null;
}

export function newProject(name = "새 상세페이지"): Project {
  const now = new Date().toISOString();
  const doc = emptyDoc();
  doc.product.name = "";
  return { id: uid("p"), name, coverImage: null, doc, createdAt: now, updatedAt: now };
}
