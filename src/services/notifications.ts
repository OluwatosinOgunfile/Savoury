import type { NotificationItem, OrderStatus } from "@/types";

const messages: Record<OrderStatus, string> = {
  preparing: "Food is preparing. The team is gathering ingredients.",
  ready: "Food is ready. Pickup or dispatch is next.",
  out_for_delivery: "Driver dispatched. Track your meal in real time.",
  delivered: "Order delivered. Enjoy your meal.",
};

export function notificationForStatus(status: OrderStatus): NotificationItem {
  return {
    id: `notify-${status}-${Date.now()}`,
    title: status.replace(/_/g, " "),
    body: messages[status],
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export async function requestPushNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}
