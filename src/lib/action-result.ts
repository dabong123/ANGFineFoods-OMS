/**
 * Next.js strips thrown error messages from Server Actions in production
 * builds (the client only ever sees a generic "Server Components render"
 * digest, by design — see https://nextjs.org/docs/messages/server-actions).
 * Wrapping every action body in runAction turns expected/validation errors
 * into ordinary return data instead of thrown exceptions, so the real
 * message actually reaches the user in production, not just in dev.
 */
export type ActionResult<T extends Record<string, unknown> = {}> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export async function runAction<T extends Record<string, unknown>>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
