"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudMode } from "./config";

/** 브라우저용 Supabase 클라이언트. 로컬 모드면 null. */
export function getBrowserSupabase() {
  if (!isCloudMode) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
