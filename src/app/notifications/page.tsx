import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { NotificationList } from "./NotificationList";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/");

  void api.notification.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 border-b border-white/20 bg-black/50 p-4 backdrop-blur">
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <NotificationList />
      </div>
    </HydrateClient>
  );
}
