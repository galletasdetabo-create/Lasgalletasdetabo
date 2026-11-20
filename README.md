# Las Galletas de Tabo — Tienda en línea y CRM

Tienda en línea de galletas personalizadas y alfajores artesanales, con carrito, checkout, pedidos, pagos PSE (Mercado Pago) y un CRM que administra el contenido del sitio.

**Horneando con amor.**

## Qué incluye

- **Sitio público** con el diseño, la tipografía, las medidas y las animaciones de la referencia (portada a pantalla completa con capas animadas, cabecera fija, tarjetas, tienda con barra lateral, ficha con miniaturas), fondo de mármol blanco y diseño responsive. Páginas: inicio, tienda con filtros, categorías, ficha de producto con personalización, carrito, checkout, estado del pedido, cuenta del cliente, nosotros, preguntas frecuentes, contacto, textos legales y créditos de imágenes.
- **Comercio**: variantes con precio propio, campos de personalización configurables y subida de imagen de referencia. Incluye tiempos de preparación, que limitan la fecha de entrega, más inventario, cupones y métodos de entrega. Los precios siempre se recalculan en el servidor.
- **Pagos**: PSE con Mercado Pago (Checkout API vía Orders) con webhooks firmados e idempotentes. También transferencia o pago coordinado y pedido por WhatsApp.
- **CRM** en `/admin`. Incluye panel de indicadores, pedidos, productos e inventario, categorías, clientes, cupones y entregas. Incluye también Mercado Pago, páginas y secciones con borrador, vista previa y publicación, biblioteca de medios, identidad visual, ajustes, mensajes, usuarios y roles, y registro de actividad.
- **SEO técnico**: metadatos por página, Open Graph, sitemap y robots dinámicos, y datos estructurados (Bakery, WebSite, Product, BreadcrumbList, FAQPage). Las URL son canónicas y el idioma es `es-CO`.

## Tecnología

Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage, RLS), Motion (solo en el mini-carrito), Zod y sharp. Tipografías: Montserrat, Cormorant Garamond y Great Vibes.

## Puesta en marcha (local)

Requisitos: Node 20.9+, Docker y la CLI de Supabase.

```bash
npm install
supabase start          # Supabase local en los puertos 574xx (ver supabase/config.toml)
cp .env.example .env.local   # completa las claves que imprime `supabase status`
supabase db reset       # aplica las migraciones
ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='una-clave-larga' npm run seed
npm run dev             # http://localhost:3000  ·  CRM: http://localhost:3000/admin
```

Ejecuta la semilla sin `ADMIN_*` si no quieres crear un administrador. Para volver a cargar solo el contenido de la página de inicio: `node --env-file=.env.local scripts/reseed-home.mjs`.

> Si cambias estilos y el resultado no se actualiza, borra la carpeta `.next` antes de compilar: la caché de compilación puede conservar el CSS anterior.

## Pruebas

```bash
npm run typecheck
npm test                          # pruebas unitarias (Vitest)
npm run build
# E2E contra el simulador local de Mercado Pago:
SIM_SECRET=sim-secret npm run mp:sim &
MERCADOPAGO_ACCESS_TOKEN=TEST-simulador MERCADOPAGO_WEBHOOK_SECRET=sim-secret \
MERCADOPAGO_API_BASE=http://127.0.0.1:4599 npm run build && npm start &
npm run test:e2e
```

## Documentación

| Documento | Contenido |
|---|---|
| [docs/01-ingenieria-inversa-dolcino.md](docs/01-ingenieria-inversa-dolcino.md) | Análisis de la referencia y decisiones de adaptación |
| [docs/02-arquitectura.md](docs/02-arquitectura.md) | Arquitectura, modelo de datos, seguridad y rendimiento |
| [docs/03-mercadopago-pse.md](docs/03-mercadopago-pse.md) | Integración de pagos y pasos para conectar producción |
| [docs/04-manual-crm.md](docs/04-manual-crm.md) | Manual del panel administrativo |
| [docs/05-pruebas-y-resultados.md](docs/05-pruebas-y-resultados.md) | Pruebas ejecutadas y resultados |
| [docs/06-despliegue.md](docs/06-despliegue.md) | Despliegue a producción y lista de pendientes |
| [docs/07-creditos-imagenes.md](docs/07-creditos-imagenes.md) | Fuente, autor y licencia de cada fotografía de stock |
