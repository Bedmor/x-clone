"use client";

import { useEffect, useState } from "react";

type NotificationPrefs = {
  likes: boolean;
  replies: boolean;
  follows: boolean;
  mentions: boolean;
};

const storageKey = "bettertwitter.notification-preferences";

const defaultPrefs: NotificationPrefs = {
  likes: true,
  replies: true,
  follows: true,
  mentions: true,
};

function parseNotificationPrefs(value: string): NotificationPrefs | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;

    const record = parsed as Record<string, unknown>;
    return {
      likes:
        typeof record.likes === "boolean" ? record.likes : defaultPrefs.likes,
      replies:
        typeof record.replies === "boolean"
          ? record.replies
          : defaultPrefs.replies,
      follows:
        typeof record.follows === "boolean"
          ? record.follows
          : defaultPrefs.follows,
      mentions:
        typeof record.mentions === "boolean"
          ? record.mentions
          : defaultPrefs.mentions,
    };
  } catch {
    return null;
  }
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    const parsed = parseNotificationPrefs(stored);
    if (parsed) {
      setPrefs(parsed);
      return;
    }

    window.localStorage.removeItem(storageKey);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(prefs));
  }, [prefs]);

  const options = [
    { key: "likes", label: "Likes" },
    { key: "replies", label: "Replies" },
    { key: "follows", label: "Follows" },
    { key: "mentions", label: "Mentions" },
  ] as const;

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div>
        <h2 className="text-xl font-bold">Notification preferences</h2>
        <p className="text-sm text-gray-400">
          Hide notification types you do not want to see.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
          >
            <span>{option.label}</span>
            <input
              type="checkbox"
              checked={prefs[option.key]}
              onChange={(event) =>
                setPrefs((current) => ({
                  ...current,
                  [option.key]: event.target.checked,
                }))
              }
              className="h-5 w-5 accent-blue-500"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseNotificationPrefs(stored);
      if (parsed) {
        setPrefs(parsed);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    }

    const handleStorage = () => {
      const nextStored = window.localStorage.getItem(storageKey);
      if (!nextStored) {
        setPrefs(defaultPrefs);
        return;
      }

      const parsed = parseNotificationPrefs(nextStored);
      setPrefs(parsed ?? defaultPrefs);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return prefs;
}
