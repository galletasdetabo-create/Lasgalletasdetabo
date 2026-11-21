import { z } from "zod";

export const CartItemInput = z.object({
  product_id: z.uuid(),
  variant_id: z.uuid().nullable(),
  quantity: z.number().int().min(1).max(1000),
  customization: z.record(z.string().max(40), z.string().max(700)).default({}),
  reference_image_path: z
    .string()
    .regex(/^pendientes\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(?:webp|png|jpg)$/, "Ruta de imagen inválida")
    .nullable()
    .default(null),
});
export type CartItemInput = z.infer<typeof CartItemInput>;

const phone = z
  .string()
  .trim()
  .min(7, "Ingresa un teléfono válido")
  .max(20)
  .regex(/^[+\d\s()-]+$/, "Usa solo números");

export const CheckoutInput = z
  .object({
    customer: z.object({
      name: z.string().trim().min(3, "Escribe tu nombre completo").max(120),
      email: z.email("Correo electrónico inválido").max(200),
      phone,
    }),
    address: z.string().trim().max(200).default(""),
    city: z.string().trim().max(80).default(""),
    neighborhood: z.string().trim().max(80).default(""),
    zip_code: z.string().trim().max(10).regex(/^\d*$/, "Solo números").default(""),
    desired_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de entrega"),
    delivery_method_id: z.uuid("Elige un método de entrega"),
    notes: z.string().trim().max(1000).default(""),
    payment_method: z.enum(["mercadopago_pse", "transferencia", "whatsapp"]),
    coupon_code: z.string().trim().toUpperCase().max(32).default(""),
    accept_terms: z.literal(true, { error: "Debes aceptar el tratamiento de datos para continuar" }),
    pse: z
      .object({
        entityType: z.enum(["individual", "association"]),
        idType: z.enum(["CC", "CE", "NIT", "TI", "PAS", "RC", "TE", "DI"]),
        idNumber: z.string().trim().regex(/^[0-9A-Za-z-]{4,20}$/, "Número de documento inválido"),
        bank: z.string().trim().min(1, "Elige tu banco").max(20),
      })
      .optional(),
    items: z.array(CartItemInput).min(1, "Tu carrito está vacío").max(50),
  })
  .superRefine((v, ctx) => {
    if (v.payment_method === "mercadopago_pse" && !v.pse) ctx.addIssue({ code: "custom", path: ["pse"], message: "Completa los datos para pagar con PSE" });
  });
export type CheckoutInput = z.infer<typeof CheckoutInput>;

/** Mensajes claros para los errores que lanza la función create_order. */
export function orderErrorMessage(raw: string): string {
  const [code, detail = ""] = raw.split(":");
  switch (code) {
    case "EMPTY_CART": return "Tu carrito está vacío.";
    case "TOO_MANY_ITEMS": return "El pedido tiene demasiados productos distintos.";
    case "INVALID_DELIVERY_METHOD": return "El método de entrega ya no está disponible. Elige otro.";
    case "ADDRESS_REQUIRED": return "Indica la dirección de entrega.";
    case "PRODUCT_UNAVAILABLE": return "Uno de los productos ya no está disponible. Revisa tu carrito.";
    case "PRODUCT_SOLD_OUT": return `«${detail}» está agotado.`;
    case "INVALID_QUANTITY": return `La cantidad de «${detail}» no es válida.`;
    case "VARIANT_REQUIRED": return `Elige una opción disponible para «${detail}».`;
    case "INSUFFICIENT_STOCK": return `No hay suficiente inventario de «${detail}».`;
    case "DATE_TOO_SOON": return `La fecha de entrega más cercana posible es ${detail}.`;
    case "COUPON": return raw.slice(7);
    case "CUSTOMIZATION_TOO_LARGE": return "La personalización es demasiado extensa.";
    default: return "No pudimos registrar tu pedido. Intenta de nuevo en unos minutos.";
  }
}
