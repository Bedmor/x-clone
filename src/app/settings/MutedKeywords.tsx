"use client";

import { useEffect, useMemo, useState } from "react";

const storageKey = "flowzest.muted-keywords";

function parseKeywords(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/g)
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function useMutedKeywords() {
  const [keywords, setKeywords] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setKeywords(parseKeywords(stored));
    }
  }, []);

  return keywords;
}

interface ContentSearchable {
  content?: string | null;
  repostOf?: ContentSearchable | null;
  parent?: ContentSearchable | null;
}

export function postContainsMutedKeyword(post: unknown, keywords: string[]) {
  if (keywords.length === 0) return false;
  if (typeof post !== "object" || post === null) return false;

  const typedPost = post as ContentSearchable;
  const text = [
    typedPost.content,
    typedPost.repostOf?.content,
    typedPost.parent?.content,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => text.includes(keyword));
}

export function MutedKeywordsSettings() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setValue(stored);
    }
  }, []);

  useEffect(() => {
    setSaved(false);
  }, [value]);

  const preview = useMemo(() => parseKeywords(value), [value]);

  const handleSave = () => {
    window.localStorage.setItem(storageKey, value);
    setSaved(true);
  };

  const handleClear = () => {
    setValue("");
    window.localStorage.removeItem(storageKey);
    setSaved(true);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div>
        <h2 className="text-xl font-bold">Susturulan kelimeler</h2>
        <p className="text-sm text-gray-400">
          Bu kelimeleri veya ifadeleri içeren gönderileri gizle.
        </p>
      </div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="spam\nkripto\nspoiler"
        rows={5}
        className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none placeholder:text-gray-500 focus:border-blue-500"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600"
        >
          Anahtar kelimeleri kaydet
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border border-white/10 px-4 py-2 font-semibold hover:bg-white/10"
        >
          Temizle
        </button>
        {saved && <span className="text-sm text-gray-400">Yerel olarak kaydedildi</span>}
      </div>
      <div className="text-sm text-gray-400">
        {preview.length > 0
          ? `Susturulan ${preview.length} kelime${preview.length === 1 ? "" : "ler"}.`
          : "Susturulan kelime yok."}
      </div>
    </div>
  );
}
