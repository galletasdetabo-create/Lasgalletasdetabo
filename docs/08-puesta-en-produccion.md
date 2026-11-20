# Puesta en producción en Cloudflare: lasgalletasdetabo.com

La app se publica como un Worker de Cloudflare con el adaptador OpenNext. El dominio, el servidor y las imágenes quedan en la misma cuenta de Cloudflare.

| Dato | Valor |
|---|---|
| Repositorio | https://github.com/galletasdetabo-create/Lasgalletasdetabo.git (rama `main`) |
| Supabase | https://oagxiixznlgosqjwihmq.supabase.co (referencia `oagxiixznlgosqjwihmq`) |
| Dominio | lasgalletasdetabo.com (registrado en Hostinger) |
| Worker | `lasgalletasdetabo` (se define en `wrangler.jsonc`) |
| Administrador inicial | galletasdetabo@gmail.com (la clave se pasa solo al ejecutar la semilla; cámbiala al entrar) |

## Qué se preparó en el proyecto

- `wrangler.jsonc` define el Worker, el dominio personalizado, el bucket R2 de caché, la base D1 de etiquetas de caché y el servicio de imágenes.
- `open-next.config.ts` guarda las páginas en R2 y las etiquetas de revalidación en D1. Así el CRM actualiza el sitio al guardar.
- `.env.production` contiene las dos variables públicas que no son secretas: la URL del sitio y la URL de Supabase.
- `sharp` ya no se usa en el servidor, porque no funciona en Workers. Las imágenes subidas se validan por sus bytes reales (JPG, PNG, WebP o AVIF) y a los JPG se les quitan los metadatos EXIF. El tamaño de entrega lo ajusta el servicio de imágenes de Cloudflare.
- Comandos nuevos: `npm run cf:build`, `npm run cf:preview` y `npm run cf:deploy`.
- Tamaño del Worker comprimido: 2,2 MB. Cabe en el plan gratuito, que permite 3 MB.

- Para que funcione en Cloudflare se quitaron dos funciones experimentales de Next.js que el adaptador no soporta bien: Cache Components y el `proxy`. La caché pública usa `unstable_cache` con etiquetas, y los encabezados `noindex` de `/admin` y `/cuenta` están en `next.config.ts`.
- Sin `proxy`, la sesión del CRM no se refresca sola. En Supabase, Authentication, Sessions, pon JWT expiry en 604800 segundos (7 días).

## 1. Subir el código a GitHub (solo este proyecto)

El repositorio local ya apunta a ese remoto y tiene los commits. Hay que autenticarse con una cuenta con permiso de escritura:

- **Opción A:** en GitHub, Settings del repositorio, Collaborators, invita a la cuenta que ya usa el PC con permiso Write. Acepta la invitación y ejecuta `git push -u origin main` dentro de esta carpeta.
- **Opción B:** crea un token fino en GitHub (Settings, Developer settings, Fine-grained tokens) con acceso solo a este repositorio y permiso Contents: Read and write. Ejecuta `git push https://TOKEN@github.com/galletasdetabo-create/Lasgalletasdetabo.git main`. No guardes el token en ningún archivo.

Ninguna de las dos cambia la configuración global de Git.

## 2. Base de datos en Supabase

En Supabase, Project Settings, reúne:

- La **contraseña de la base de datos** (Database). Si no la recuerdas, restablécela allí.
- La **clave publicable** `sb_publishable_...` y la **clave secreta** `sb_secret_...` (API Keys).

Desde esta carpeta ejecuta:

```bash
npx supabase link --project-ref oagxiixznlgosqjwihmq
npx supabase db push
```

El primer comando pide iniciar sesión en Supabase y el segundo pide la contraseña de la base. Solo escriben dentro de `supabase/.temp` de este proyecto.

Después carga el contenido inicial y crea el administrador. En PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://oagxiixznlgosqjwihmq.supabase.co"
$env:SUPABASE_SECRET_KEY="PEGA_AQUI_LA_CLAVE_SECRETA"
$env:ADMIN_EMAIL="galletasdetabo@gmail.com"
$env:ADMIN_PASSWORD="LA_CLAVE_INDICADA"
npm run seed
```

Hazlo antes del primer despliegue, porque la compilación lee el catálogo de la base de datos.

## 3. Dominio en Cloudflare

1. En Cloudflare pulsa "Add a domain", escribe `lasgalletasdetabo.com` y elige el plan Free.
2. Cloudflare muestra dos nameservers. En Hostinger, dentro del dominio, ve a DNS / Nameservers y reemplázalos por esos dos.
3. Espera hasta que Cloudflare muestre el dominio como "Active". Puede tardar de minutos a unas horas.
4. En SSL/TLS deja el modo en Full (strict).

El Worker crea solo los registros del dominio y de `www` al desplegarse. El dominio debe estar activo en la misma cuenta antes de desplegar.

## 4. Activar servicios en la cuenta de Cloudflare

1. **R2:** en Storage & databases, R2 object storage, activa el servicio. Puede pedir una tarjeta, aunque el uso de este sitio entra en la capa gratuita.
2. **Imágenes:** si el primer despliegue avisa de que Images no está habilitado, actívalo en Media, Images, Transformations.

El bucket R2 y la base D1 se crean solos en el primer despliegue.

## 5. Variables de entorno

Hay dos lugares distintos, y las claves se necesitan en ambos.

**Para compilar (en tu PC):** crea el archivo `.env.production.local` en la raíz del proyecto. Git lo ignora y no se sube. Contenido:

```
NEXT_PUBLIC_SITE_URL=https://lasgalletasdetabo.com
NEXT_PUBLIC_SUPABASE_URL=https://oagxiixznlgosqjwihmq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Este archivo tiene prioridad sobre `.env.local` (que apunta al Supabase de pruebas de tu PC), así que el despliegue nunca mezcla datos locales con los de producción.

**Para que el sitio funcione (en Cloudflare):** Workers & Pages, tu Worker `lasgalletasdetabo`, Settings, Variables and Secrets. Añade como Secret:

| Variable | Valor |
|---|---|
| `SUPABASE_SECRET_KEY` | clave secreta `sb_secret_...` |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | secreto de firma del webhook |

Y como Variable de texto:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave publicable `sb_publishable_...` |
| `MERCADOPAGO_PUBLIC_KEY` | Public Key de Mercado Pago |
| `MERCADOPAGO_ENVIRONMENT` | `test` hasta tener credenciales reales; luego `production` |

Sin las de Mercado Pago el sitio funciona, pero PSE queda desactivado y se ofrecen transferencia y WhatsApp. Como el Worker aún no existe antes del primer despliegue, hazlo después del paso 6 o usa `npx wrangler secret put NOMBRE` desde la carpeta del proyecto.

## 6. Desplegar

```bash
npx wrangler login
npm run cf:deploy
```

`wrangler login` abre el navegador para autorizar tu cuenta de Cloudflare. `cf:deploy` compila, sube la caché inicial y publica. Al terminar, el sitio responde en `https://lasgalletasdetabo.com`.

Para publicar cambios futuros basta volver a ejecutar `npm run cf:deploy`.

## 7. Autenticación en Supabase

En Supabase, Authentication, URL Configuration, el Site URL debe ser `https://lasgalletasdetabo.com`, con esa URL también en las de redirección. Según tu indicación, esto ya está configurado.

## 8. Después de publicar

1. Entra a `https://lasgalletasdetabo.com/admin` y cambia la clave del administrador.
2. En Ajustes completa WhatsApp, Instagram, contacto, textos legales y datos de transferencia.
3. Reemplaza los precios de prueba y las fotos de stock, según el panel de pendientes.
4. En Mercado Pago registra el webhook `https://lasgalletasdetabo.com/api/webhooks/mercadopago`.
5. Revisa `/sitemap.xml` y `/robots.txt` y registra el sitio en Google Search Console.

## Problemas frecuentes

- **El despliegue dice que el dominio no está en la cuenta:** el paso 3 no ha terminado. Espera a que figure como Active.
- **Error de R2 o D1:** activa R2 en la cuenta (paso 4) y repite `npm run cf:deploy`.
- **La compilación falla al leer el catálogo:** falta ejecutar el paso 2 o el archivo `.env.production.local`.
- **Los cambios del CRM no se ven:** revisa que el Worker tenga la base D1 enlazada en Settings, Bindings.
