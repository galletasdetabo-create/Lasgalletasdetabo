# Pruebas y resultados

Entorno: Windows 11, Node 24, Supabase local (CLI 2.106) y build de producción de Next.js 16.4.6 con `next start`. Chrome 157 para Playwright y Lighthouse. Fecha: 19/11/2026.

## Inventario de pruebas

### Estáticas

- `tsc --noEmit` sin errores.
- `next build` sin errores. Las páginas públicas se prerenderizan como estáticas o parcialmente estáticas.

### Unitarias (Vitest, `tests/unit`)

- Firma de webhooks de Mercado Pago:
  - manifiesto idéntico al del SDK oficial;
  - interpretación de `x-signature`;
  - firma válida e identificador en minúsculas;
  - alterada, ausente, sin `ts`, sin `v1`, sin secreto, otro secreto y fuera de tolerancia.
- Mapeo de estados de la Orders API y reglas de precedencia: un pago aprobado nunca retrocede y un rechazo solo cambia si llega una aprobación.
- Ajustes del sitio:
  - combinación con los valores por defecto;
  - **rechazo de colores maliciosos** que podrían inyectar CSS;
  - normalización de WhatsApp e Instagram.
- Formato COP y slugs.
- Validación del checkout: aceptación de datos, datos PSE obligatorios y rutas de imagen manipuladas.

### End-to-end (Playwright, `tests/e2e`)

| Archivo | Qué verifica |
|---|---|
| `storefront.spec.ts` | Todas las secciones del inicio; ninguna imagen rota ni error de consola. SEO técnico: título, descripción, canonical, Open Graph, `lang`, JSON-LD Bakery, Product y Breadcrumb, robots y sitemap. Navegación por categorías, búsqueda y orden por precio. Ficha de producto: variantes que cambian el precio, campos de personalización, validación de obligatorios y relacionados |
| `purchase.spec.ts` | Compra completa por transferencia: personalización, imagen de referencia subida, variantes de alfajores, carrito persistente tras recargar, cambio de cantidades, eliminación y **manipulación del precio en `localStorage` ignorada**. Checkout con fecha tomada del producto, aceptación de datos obligatoria, página de confirmación y verificación en la base de datos (totales, ítems, personalización, imagen en el bucket privado, cliente). Fecha de entrega que no respeta el tiempo de preparación: rechazada |
| `pse.spec.ts` | PSE con el simulador: aprobación por **webhook firmado**, rechazo con reintento y nueva aprobación, y aprobación **sin webhook** verificada por el servidor al regresar |
| `security.spec.ts` | Webhook sin firma o con firma falsa: 401. Notificación repetida: no se procesa dos veces. Orden ajena: se ignora. RLS: un visitante no lee pedidos, clientes ni cupones, no modifica productos, no ve borradores, no invoca `create_order` y no lista referencias privadas. El CRM exige sesión y rol (un cliente registrado queda bloqueado). La subida valida el contenido real. Cabeceras de seguridad |
| `admin.spec.ts` | Los 14 módulos del CRM cargan sin errores. Un cambio de precio se ve en la tienda. CMS: el borrador no es público, la vista previa lo muestra y al publicar se ve en el sitio. Configurar WhatsApp activa sus llamados y al vaciarlo desaparecen. Cambio de estado del pedido con nota y registro de actividad. Biblioteca: subir, editar y eliminar. Imagen en uso: no se puede eliminar |
| `responsive.spec.ts` | Proyecto móvil (Pixel 7). Sin desbordamiento horizontal en 9 páginas. Menú móvil con acordeón de categorías. Carrito táctil que cabe en pantalla. Campos con fuente de 16 px |

## Resultados (19/11/2026, diseño final)

| Verificación | Resultado |
|---|---|
| `tsc --noEmit` | Sin errores |
| ESLint | Sin errores ni avisos |
| Vitest | 18 de 18 pruebas pasan |
| Playwright, escritorio y móvil | 32 de 32 pruebas pasan |

Notas:

- La prueba de WhatsApp modifica el ajuste real. Si una corrida se interrumpe, el número de prueba queda guardado. Hay que dejarlo vacío con la opción activada antes de repetir, porque el panel de pendientes lo comprueba.
- El pago PSE se verificó contra el simulador local, no contra Mercado Pago real.
- No se re-midió Lighthouse tras el rediseño. Debe repetirse en una máquina sin otras cargas.

### Cambios de la última revisión del diseño

- La página de inicio se auditó de nuevo contra la referencia con el navegador: se midieron la línea animada de los separadores, las dos franjas con parallax, el efecto al pasar el cursor sobre los productos y la ausencia de animaciones de entrada en textos e imágenes.
- `scripts/check-bands.mjs` verifica en la web las alturas, el desplazamiento del parallax (0,4 y 0,44 × distancia) y la animación de 1 s de la línea.
- Las pruebas de subida de imágenes esperan a que la página termine de cargar antes de adjuntar el archivo.
- La subida de referencias admite 12 archivos cada 10 minutos por dirección IP. Si se hacen pruebas manuales repetidas, hay que reiniciar el servidor antes de lanzar la suite.

### Causa de los fallos intermitentes de subida de imágenes

El proyecto usaba `sharp` 0.34 y Next.js incluye su propia copia 0.35. Con dos versiones en el mismo proceso, `sharp` fallaba con «colourspace: parameter space not set» y dejaba de procesar imágenes hasta reiniciar. Se alineó el proyecto a `sharp` 0.35.5 y los fallos desaparecieron (32 de 32 pruebas E2E).

### Secciones añadidas tras la galería

- **Pura delicia** (`menu_list`): franja con parallax a 0,44 × distancia, fondo de la tarta de corazón, lista de galletas y alfajores con precio.
- **Tradición** (`timeline`): fondo de 1920 × 819 con la línea y los puntos dibujados. Los textos y los botones se colocan en porcentajes de ese lienzo. Cambian el texto con 0,4 s y el año activo con 0,2 s. En móvil pasa a una lista de botones sobre el fondo velado. Los años y los textos de los hitos 2 a 5 son provisionales.
