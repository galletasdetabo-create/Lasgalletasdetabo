# Arquitectura

## Visión general

```
Navegador ──► Next.js 16 (App Router)
               ├─ Páginas públicas: prerenderizadas (Cache Components) y revalidadas por etiquetas
               ├─ Server Actions: checkout, CRM, formularios
               ├─ Route Handlers: /api/webhooks/mercadopago, /api/uploads/referencia, /api/events
               └─ Proxy: refresca la sesión solo en /admin y /cuenta
                    │
                    ▼
              Supabase: Postgres + RLS · Auth · Storage (media pública, order-references privada)
                    │
                    ▼
              Mercado Pago (Orders API) ◄── webhooks firmados
```

## Carpetas

| Ruta | Contenido |
|---|---|
| `src/app/(site)` | Sitio público: inicio, tienda, producto, carrito, checkout, pedido, cuenta, páginas del CMS |
| `src/app/admin` | CRM: `acceso` (login), `(panel)` (módulos), `vista-previa` (borradores) |
| `src/app/api` | Webhook de Mercado Pago, subida de referencias, métricas |
| `src/components/sections` | Un componente por tipo de bloque del CMS |
| `src/components/admin` | Editores del CRM (productos, secciones, medios, ajustes…) |
| `src/lib/data/public.ts` | Lecturas públicas con `'use cache'` y etiquetas (`settings`, `media`, `catalog`, `sections`) |
| `src/lib/cms` | Definición de secciones y de ajustes del sitio |
| `src/lib/payments` | Cliente de Mercado Pago, firma de webhooks, estados y servicio de pagos |
| `src/lib/checkout` | Validación, cotización autoritativa y medios de pago disponibles |
| `supabase/migrations` | Esquema, funciones, RLS, permisos y almacenamiento |
| `scripts` | Semilla, simulador de Mercado Pago, textura de mármol, capturas |

## Modelo de datos

- **Catálogo**: `categories`, `products` (precio base, promoción, disponibilidad, inventario, cantidades, preparación, `customization_fields` JSON, SEO, `is_sample`), `product_variants` (opciones y precio propio) y `product_images` (galería ordenada sobre `media`).
- **CMS**: `site_settings` (marca, contacto, redes, WhatsApp, SEO, footer, legales, comercio, pagos) y `page_sections` (bloques por página con versión publicada y columnas de borrador `draft_*`). `media` registra dimensiones, formato, texto alternativo, carpeta, si es foto de stock, fuente, autor y licencia.
- **Comercio**: `delivery_methods`, `coupons`, `customers`, `orders` (número legible `GT-1001`, token público, datos del comprador, entrega, totales, estado y pago), `order_items` (precio y personalización congelados), `order_status_history`, `payments` (intentos por proveedor con clave de idempotencia) y `webhook_events` (registro con clave única de deduplicación).
- **Operación**: `activity_log` (auditoría del CRM), `analytics_events` (métricas anónimas de conversión) y `contact_messages`.

Estados de pedido: pendiente → confirmado → en preparación → listo → enviado → entregado, o cancelado. Al cancelar se devuelve el inventario una sola vez.

Estados de pago: pendiente, en proceso, aprobado, rechazado, cancelado, expirado y reembolsado.

## Reglas de negocio en la base de datos

- `create_order(p jsonb)` crea el pedido completo en una sola transacción. Recalcula precios desde las tablas y valida producto activo, variante, cantidades mínimas, máximas y paso, e inventario, que descuenta. Valida también la fecha mínima según el tiempo de preparación, el cupón y el método de entrega. Solo puede invocarla `service_role` desde el servidor.
- `coupon_discount` valida vigencia, usos y subtotal mínimo.
- `publish_page` publica de forma atómica todos los borradores de una página.
- `dashboard_stats`, `media_usage` y `media_usage_counts` alimentan el panel y la protección contra borrados.
- Disparadores: historial automático de estados y liberación de inventario al cancelar.

## Seguridad

- **RLS en todas las tablas**. El público solo lee el catálogo activo, los ajustes públicos y la versión publicada de las secciones; las columnas de borrador no se conceden a `anon`. Pedidos, clientes, pagos y registros solo los ve el equipo; un cliente con sesión solo ve sus propios pedidos.
- **Permisos explícitos** con mínimo privilegio. Se revocan los permisos por defecto y se concede columna por columna donde aplica: un usuario solo puede editar su nombre y teléfono, nunca su rol.
- **Roles**. El administrador tiene acceso total. El editor gestiona catálogo, pedidos, contenido y medios, sin acceso a pagos, WhatsApp, cupones, entregas ni usuarios. Cada página y acción del CRM verifica el rol en el servidor con `requireStaff` o `requireAdmin`; el proxy solo refresca la sesión.
- **Validación con Zod** en todas las acciones. El contenido de las secciones se depura contra su definición, eliminando campos desconocidos y enlaces `javascript:`.
- **Archivos**. Las imágenes se validan por contenido real con sharp y se re-codifican, lo que elimina metadatos y cargas maliciosas; el SVG no se acepta. Las referencias de los clientes van a un bucket privado y el CRM las abre con enlaces firmados de 10 minutos.
- **Webhooks**. Se verifica la firma HMAC-SHA256 con comparación en tiempo constante y tolerancia de 3 días, se deduplican por `x-request-id` y se consulta el recurso en la API antes de cambiar estados. También se comprueba que el monto y la referencia coincidan.
- **Secretos** solo en variables de entorno del servidor. El Access Token nunca llega al navegador ni a la base de datos.
- **Límites de frecuencia** en login, checkout, subidas, contacto, cotización y webhooks. Son en memoria; con varias instancias conviene un almacén compartido.
- **Cabeceras**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, HSTS en producción, `noindex` en zonas privadas y `poweredByHeader: false`.

## Rendimiento

- Las páginas públicas se prerenderizan en el shell estático (Cache Components) y se invalidan por etiqueta cuando el CRM guarda cambios, con `updateTag` y semántica de lectura tras escritura.
- **JavaScript mínimo**. La línea de los separadores usa CSS y un único IntersectionObserver; el parallax usa un solo detector de scroll con requestAnimationFrame. El mini-carrito con Motion se carga de forma diferida al abrirse por primera vez. El hero no usa preloader.
- Las imágenes pasan por `next/image` con AVIF/WebP, `sizes` ajustados, placeholder difuminado y precarga solo de la imagen principal.
- Las fuentes se sirven con `next/font` desde el mismo dominio; la pareja alternativa no se precarga.
- El fondo general del sitio es blanco liso. La textura de mármol (`public/textures/marble.webp`) ya no se usa como fondo de página; solo se conservan los fondos fotográficos de las franjas.
- La cabecera usa `PathnameSync` dentro de `<Suspense>`, de modo que la ruta activa no impide prerenderizar.

## Animaciones (recreadas de la referencia)

| Patrón | Implementación |
|---|---|
| Preloader | Línea dorada con rombo, se oculta al terminar la carga (máx. 2,5 s) |
| Hero | Capas con la animación medida: subtítulo desde −50 px (1 s, power2.out), título desde +50 px (1 s, power2.inOut), separador que escala (0,5 s, power4.out), párrafo y botones en fundido. Fondo con desplazamiento lento y cruce de 1 s. Autoavance a los 7 s |
| Separadores | La línea de 140 px crece desde el centro en 1 s al entrar en pantalla (`[data-reveal="sep"]` y un único IntersectionObserver). El rombo no se anima |
| Parallax | `ParallaxBand` (cliente): imagen fija con posición vertical 0,4 × velocidad × distancia al borde superior. Solo en escritorio con puntero; en táctiles y con reducción de movimiento la imagen queda quieta |
| Aparición de textos e imágenes | No existe, igual que en la referencia |
| Cabecera fija | Entra al subir y sale al bajar: 0,6 s `cubic-bezier(0.77, 0, 0.175, 1)` |
| Menú desplegable | Opacidad + 8 px, 0,2 s |
| Tarjetas de producto | Velo blanco al 90 % con enlace dorado, 0,2 s `ease-out`; la imagen baja de 1,06 a 1 en 0,8 s |
| Botones | Cambio de color y fondo en 0,25 s lineal |
| Menú móvil | Acordeón con transición de altura de 0,5 s |
| Mini-carrito | Motion: deslizamiento 0,6 s con elementos escalonados |
| `prefers-reduced-motion` | Desactiva animaciones y muestra el contenido de inmediato |
