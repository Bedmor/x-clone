"use client";

import { api } from "~/trpc/react";

export function PrivacySettings() {
  const utils = api.useUtils();
  const { data, isLoading } = api.user.getPrivacySettings.useQuery();

  const updatePrivacy = api.user.updatePrivacySettings.useMutation({
    onSuccess: () => {
      void utils.user.getPrivacySettings.invalidate();
      alert("Gizlilik ayarları güncellendi");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-xl font-bold">Gizlilik</h2>
        <p className="text-sm text-gray-400">Gizlilik ayarları yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div>
        <h2 className="text-xl font-bold">Gizlilik</h2>
        <p className="text-sm text-gray-400">
          Paylaşımlarınızı kimlerin görebileceğini ve kimlerin yeni konuşmalar
          başlatabileceğini kontrol edin.
        </p>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div>
          <p className="font-semibold">Özel hesap</p>
          <p className="text-sm text-gray-400">
            Yalnızca onaylı takipçiler gönderilerinizi görebilir.
          </p>
        </div>
        <input
          type="checkbox"
          checked={data.isPrivate}
          onChange={(e) =>
            updatePrivacy.mutate({ isPrivate: e.target.checked })
          }
          className="h-5 w-5"
        />
      </label>

      <div className="space-y-2">
        <label className="text-sm text-gray-400">
          Kimler size mesaj atabilir
        </label>
        <select
          value={data.messagePermission}
          onChange={(e) =>
            updatePrivacy.mutate({
              messagePermission: e.target.value as
                | "EVERYONE"
                | "FOLLOWING"
                | "NO_ONE",
            })
          }
          className="w-full rounded-xl border border-white/20 bg-black p-2"
        >
          <option value="EVERYONE">Herkes</option>
          <option value="FOLLOWING">Takip ettikleriniz</option>
          <option value="NO_ONE">Hiç kimse</option>
        </select>
      </div>
    </div>
  );
}
