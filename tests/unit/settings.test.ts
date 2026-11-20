import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, instagramUrl, mergeSettings, normalizeWhatsApp, whatsappLink } from "@/lib/cms/settings";
import { formatCOP, slugify } from "@/lib/format";
import { CheckoutInput, orderErrorMessage } from "@/lib/checkout/validation";

describe("ajustes del sitio", () => {
  it("combina filas con los valores por defecto y descarta colores inválidos", () => {
    const s = mergeSettings([
      { key: "brand", value: { name: "Otra", colors: { chocolate: "red;}</style><script>", gold: "#ABCDEF" } } },
      { key: "desconocida", value: { x: 1 } },
    ]);
    expect(s.brand.name).toBe("Otra");
    expect(s.brand.colors.chocolate).toBe(DEFAULT_SETTINGS.brand.colors.chocolate);
    expect(s.brand.colors.gold).toBe("#ABCDEF");
    expect(s.brand.colors.cream).toBe(DEFAULT_SETTINGS.brand.colors.cream);
  });

  it("normaliza números de WhatsApp colombianos", () => {
    expect(normalizeWhatsApp("300 123 4567")).toBe("573001234567");
    expect(normalizeWhatsApp("+57 300 123 4567")).toBe("573001234567");
    expect(normalizeWhatsApp("")).toBe("");
    expect(whatsappLink("", "hola")).toBeNull();
    expect(whatsappLink("3001234567", "hola mundo")).toBe("https://wa.me/573001234567?text=hola%20mundo");
  });

  it("genera URLs de Instagram", () => {
    expect(instagramUrl("@tabo")).toBe("https://www.instagram.com/tabo/");
    expect(instagramUrl("")).toBeNull();
  });
});

describe("formato", () => {
  it("formatea pesos colombianos sin decimales", () => {
    expect(formatCOP(45000)).toBe("$ 45.000");
    expect(formatCOP(1234567)).toBe("$ 1.234.567");
  });
  it("crea slugs sin tildes", () => {
    expect(slugify("Galletas de Cumpleaños ¡Únicas!")).toBe("galletas-de-cumpleanos-unicas");
  });
});

describe("validación del checkout", () => {
  const base = {
    customer: { name: "Ana Pérez", email: "ana@example.com", phone: "300 123 4567" },
    desired_date: "2030-01-10",
    delivery_method_id: "6f1c2b9e-1111-4a2b-9c3d-123456789abc",
    payment_method: "transferencia",
    accept_terms: true,
    items: [{ product_id: "6f1c2b9e-2222-4a2b-9c3d-123456789abc", variant_id: null, quantity: 2, customization: {}, reference_image_path: null }],
  };
  it("acepta un pedido válido", () => expect(CheckoutInput.safeParse(base).success).toBe(true));
  it("exige aceptar el tratamiento de datos", () => expect(CheckoutInput.safeParse({ ...base, accept_terms: false }).success).toBe(false));
  it("exige datos PSE al elegir PSE", () => expect(CheckoutInput.safeParse({ ...base, payment_method: "mercadopago_pse" }).success).toBe(false));
  it("rechaza rutas de imagen manipuladas", () => {
    const bad = { ...base, items: [{ ...base.items[0], reference_image_path: "../../etc/passwd" }] };
    expect(CheckoutInput.safeParse(bad).success).toBe(false);
  });
  it("traduce errores de la base de datos", () => {
    expect(orderErrorMessage("DATE_TOO_SOON:2030-01-05")).toContain("2030-01-05");
    expect(orderErrorMessage("COUPON:El cupón ya venció.")).toBe("El cupón ya venció.");
    expect(orderErrorMessage("algo raro")).toContain("No pudimos");
  });
});
