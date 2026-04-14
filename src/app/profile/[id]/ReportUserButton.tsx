"use client";

import { Flag } from "lucide-react";
import { api } from "~/trpc/react";

const reasonPrompt =
  "Rapor sebebi (SPAM, TACİZ, NEFRET, ŞİDDET, NSFW, YANLIŞ BİLGİ, DİĞER)";
function normalizeReason(input: string) {
  const normalized = input.trim().toUpperCase();
  const validReasons = new Set([
    "SPAM",
    "HARASSMENT",
    "HATE",
    "VIOLENCE",
    "NSFW",
    "MISINFORMATION",
    "OTHER",
  ]);
  return validReasons.has(normalized) ? normalized : null;
}

export function ReportUserButton({ userId }: { userId: string }) {
  const reportUser = api.report.create.useMutation({
    onSuccess: () => {
      alert("Teşekkürler, raporunuz gönderildi.");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleReport = () => {
    const reasonInput = window.prompt(reasonPrompt, "SPAM");
    if (!reasonInput) return;

    const reason = normalizeReason(reasonInput);
    if (!reason) {
      alert("Lütfen listelenen sebeplerden birini kullanın.");
      return;
    }

    const details = window.prompt("İsteğe bağlı detaylar", "") ?? undefined;

    reportUser.mutate({
      userId,
      reason: reason as
        | "SPAM"
        | "HARASSMENT"
        | "HATE"
        | "VIOLENCE"
        | "NSFW"
        | "MISINFORMATION"
        | "OTHER",
      details: details?.trim() ? details : undefined,
    });
  };

  return (
    <button
      onClick={handleReport}
      disabled={reportUser.isPending}
      className="rounded-full border border-white/20 p-2 hover:bg-white/10 disabled:opacity-50"
      title="Kullanıcıyı bildir"
    >
      <Flag className="h-5 w-5" />
    </button>
  );
}
