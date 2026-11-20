"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    const id = window.setTimeout(() => track("product_view", { productId }), 800);
    return () => window.clearTimeout(id);
  }, [productId]);
  return null;
}
