# Despliegue a producción

## 1. Supabase (proyecto en la nube)

1. Crear un proyecto en https://supabase.com con región cercana a Colombia (por ejemplo, São Paulo).
2. Aplicar las migraciones: `supabase link --project-ref <ref>` y luego `supabase db push`.
3. En Authentication › URL Configuration, poner como Site URL `https://TU-DOMINIO` y agregar la redirección `https://TU-DOMINIO/cuenta`.
4. En Authentication › Providers › Email, mantener la confirmación de correo activa y configurar un SMTP propio para producción.
5. Cargar el contenido inicial con las variables del proyecto:
   `NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/seed.mjs`.
   La semilla es idempotente y no sobrescribe contenido ya editado.

## 2. Hosting de Next.js (por ejemplo Vercel)

1. Importar el repositorio.
2. Configurar las variables de `.env.example`:
   - `NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` (marcarla como sensible)
   - las variables `MERCADOPAGO_*` (ver [03-mercadopago-pse.md](03-mercadopago-pse.md))
   - **no** definir `MERCADOPAGO_API_BASE`
3. Build: `npm run build`. Runtime: Node 20.9 o superior.
4. Conectar el dominio y verificar que use HTTPS. Es obligatorio para los webhooks y el retorno de PSE.

> El limitador de frecuencia funciona en memoria por instancia. Con varias instancias o funciones serverless conviene reemplazarlo por un almacén compartido (Upstash/Redis) en `src/lib/rate-limit.ts`.

## 3. Después del despliegue

- [ ] Iniciar sesión en `/admin` con el administrador creado y cambiar la contraseña.
- [ ] Completar la lista «Pendientes de configuración» del panel.
- [ ] Mercado Pago en modo pruebas: compra con «Banco Prueba PSE» y webhook recibido con firma válida (CRM › Mercado Pago).
- [ ] Pasar Mercado Pago a producción.
- [ ] Registrar el sitio en Google Search Console y enviar `https://TU-DOMINIO/sitemap.xml`.
- [ ] Ejecutar Lighthouse sobre el dominio final.

## Información que debe aportar la tienda

| Dato | Dónde se configura |
|---|---|
| Número de WhatsApp | CRM › Ajustes › WhatsApp |
| Correo, teléfono, ciudad, zona de cobertura y horario | CRM › Ajustes › Contacto |
| Cuenta de Instagram y otras redes | CRM › Ajustes › Redes sociales |
| Datos bancarios para transferencias | CRM › Ajustes › Comercio |
| Precios reales y tiempos de preparación | CRM › Productos |
| Tarifas y cobertura de domicilios | CRM › Métodos de entrega |
| Política de privacidad (Ley 1581 de 2012), términos, envíos y cambios | CRM › Ajustes › Textos legales |
| Fotografías propias de los productos | CRM › Biblioteca de medios › Sustituir archivo |
| Testimonios reales autorizados | CRM › Páginas › Inicio › Testimonios |
| Credenciales de Mercado Pago y clave del webhook | Variables de entorno del hosting |
| Dominio | Hosting y `NEXT_PUBLIC_SITE_URL` |
