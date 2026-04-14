"use client";

import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { UserAvatar } from "~/app/_components/UserAvatar";
import Link from "next/link";
import { Heart, MessageCircle, UserPlus, AtSign } from "lucide-react";
import { useNotificationPreferences } from "~/app/settings/NotificationPreferences";

type NotificationType = RouterOutputs["notification"]["getAll"][number];

export function NotificationList() {
  const [notifications] = api.notification.getAll.useSuspenseQuery();
  const prefs = useNotificationPreferences();

  const visibleNotifications = notifications.filter((notification) => {
    switch (notification.type) {
      case "LIKE":
        return prefs.likes;
      case "REPLY":
        return prefs.replies;
      case "FOLLOW":
        return prefs.follows;
      case "MENTION":
        return prefs.mentions;
      default:
        return true;
    }
  });

  if (!visibleNotifications || visibleNotifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No notifications yet</div>
    );
  }

  return (
    <div className="flex flex-col">
      {visibleNotifications.map((notification: NotificationType) => {
        let icon = null;
        let text = "";
        let href = "";

        switch (notification.type) {
          case "LIKE":
            icon = (
              <Heart className="h-6 w-6 text-pink-500" fill="currentColor" />
            );
            text = "liked your post";
            href = `/post/${notification.postId}`;
            break;
          case "REPLY":
            icon = (
              <MessageCircle
                className="h-6 w-6 text-blue-400"
                fill="currentColor"
              />
            );
            text = "replied to your post";
            href = `/post/${notification.postId}`;
            break;
          case "FOLLOW":
            icon = (
              <UserPlus className="h-6 w-6 text-blue-400" fill="currentColor" />
            );
            text = "followed you";
            href = `/profile/${notification.actorId}`;
            break;
          case "MENTION":
            icon = <AtSign className="h-6 w-6 text-blue-400" />;
            text = "mentioned you in a post";
            href = `/post/${notification.postId}`;
            break;
        }

        return (
          <Link
            key={notification.id}
            href={href}
            className="flex items-start gap-4 border-b border-white/20 p-4 hover:bg-white/5"
          >
            <div className="mt-1">{icon}</div>
            <div className="flex flex-col gap-2">
              <UserAvatar
                src={notification.actor.image}
                alt={notification.actor.name}
                className="h-8 w-8"
              />
              <div>
                <span className="font-bold">{notification.actor.name}</span>{" "}
                <span className="text-gray-500">{text}</span>
              </div>
              {notification.post && (
                <p className="line-clamp-2 text-gray-500">
                  {notification.post.content}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
