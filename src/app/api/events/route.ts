import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  type: z.enum(["page_view", "product_view", "add_to_cart", "checkout_start", "order_created"]),
  sessionId: z.string().min(1).max(64),
  path: z.string().max(300).optional(),
  productId: z.uuid().optional(),
});

/** Indicadores básicos de conversión (sin datos personales). */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`ev:${clientIp(req.headers)}`, 120, 60_000);
  if (!rl.ok) return new NextResponse(null, { status: 204 });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return new NextResponse(null, { status: 204 });
    const { type, sessionId, path, productId } = parsed.data;
    await createServiceClient().from("analytics_events").insert({ type, session_id: sessionId, path: path ?? null, product_id: productId ?? null });
  } catch {
    // las métricas nunca deben romper la navegación
  }
  return new NextResponse(null, { status: 204 });
}
