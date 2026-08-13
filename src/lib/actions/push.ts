"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { runAction, type ActionResult } from "@/lib/action-result";

type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPushNotifications(
  subscription: PushSubscriptionInput
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error("Invalid push subscription");
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return {};
  });
}

export async function unsubscribeFromPushNotifications(endpoint: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireSession();
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return {};
  });
}
