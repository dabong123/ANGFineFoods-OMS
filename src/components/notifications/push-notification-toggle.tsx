"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from "@/lib/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "checking" | "off" | "on" | "denied";

export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    });
  }, []);

  async function handleEnable() {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      window.alert("Push notifications aren't configured for this deployment yet.");
      return;
    }
    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) as BufferSource,
      });

      const json = subscription.toJSON();
      const res = await subscribeToPushNotifications({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setStatus("on");
    } catch {
      window.alert("Couldn't enable notifications on this device/browser.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisable() {
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPushNotifications(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } finally {
      setIsPending(false);
    }
  }

  if (status === "unsupported" || status === "checking") return null;

  if (status === "denied") {
    return (
      <Button variant="ghost" size="icon" title="Notifications blocked — enable them in your browser/site settings" disabled>
        <BellOff className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={status === "on" ? handleDisable : handleEnable}
      title={status === "on" ? "Order notifications on — tap to turn off" : "Turn on order notifications"}
    >
      {status === "on" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );
}
