"use client";

type EventType = "page_view" | "product_view" | "add_to_cart" | "checkout_start" | "order_created";

/** Sesión anónima (sin datos personales) para indicadores básicos de conversión. */
function sessionId() {
  try {
    let id = sessionStorage.getItem("lgt-sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("lgt-sid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function track(type: EventType, extra: { productId?: string } = {}) {
  try {
    const body = JSON.stringify({ type, sessionId: sessionId(), path: location.pathname, productId: extra.productId });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {}
}
