# Puesta en producción: lasgalletasdetabo.com

Datos del proyecto (no secretos):

| Dato | Valor |
|---|---|
| Repositorio | https://github.com/galletasdetabo-create/Lasgalletasdetabo.git (rama `main`) |
| Supabase | https://oagxiixznlgosqjwihmq.supabase.co (referencia `oagxiixznlgosqjwihmq`) |
| Dominio | lasgalletasdetabo.com (registrado en Hostinger) |
| Administrador inicial | galletasdetabo@gmail.com (la clave se pasa solo al ejecutar la semilla; cámbiala al entrar) |

## 1. Subir el código a GitHub (solo este proyecto)

El repositorio local ya apunta a ese remoto y tiene un commit. Para subirlo hay que autenticarse con una cuenta con permiso de escritura:

- **Opción A:** en GitHub, Settings del repositorio, Collaborators, invita a la cuenta que ya usa el PC con permiso Write. Acepta la invitación y ejecuta `git push -u origin main` dentro de esta carpeta.
- **Opción B:** crea un token fino en GitHub (Settings, Developer settings, Fine-grained tokens) con acceso solo a este repositorio y permiso Contents: Read and write. Ejecuta `git push https://TOKEN@github.com/galletasdetabo-create/Lasgalletasdetabo.git main`. No guardes el token en ningún archivo.

Ninguna de las dos cambia la configuración global de Git.

## 2. Base de datos en Supabase

En Supabase abre el proyecto y reúne estos datos:

- **Contraseña de la base de datos:** Project Settings, Database. Si no la recuerdas, restablécela allí.
- **Claves de API:** Project Settings, API Keys. Necesitas la clave publicable (`sb_publishable_...`) y la clave secreta (`sb_secret_...`).

Desde esta carpeta ejecuta:

```bash
npx supabase link --project-ref oagxiixznlgosqjwihmq
npx supabase db push
```

El primer comando pide iniciar sesión en Supabase y el segundo pide la contraseña de la base de datos. Estos comandos solo escriben dentro de `supabase/.temp` de este proyecto.

Después carga el contenido inicial y crea el administrador. En PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://oagxiixznlgosqjwihmq.supabase.co"
$env:SUPABASE_SECRET_KEY="PEGA_AQUI_LA_CLAVE_SECRETA"
$env:ADMIN_EMAIL="galletasdetabo@gmail.com"
$env:ADMIN_PASSWORD="LA_CLAVE_INDICADA"
npm run seed
```

La semilla sube las imágenes y los textos, y crea el usuario administrador. Las variables solo viven en esa ventana de PowerShell.

## 3. Variables de entorno del hosting

Se escriben en el panel del hosting donde se despliegue la app, no en el repositorio:

- **Vercel:** Project, Settings, Environment Variables, entorno Production.
- **Cloudflare Workers:** Worker, Settings, Variables and Secrets (los valores secretos como Secret).

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://lasgalletasdetabo.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oagxiixznlgosqjwihmq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave publicable `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | clave secreta `sb_secret_...` (marcar como secreto) |
| `MERCADOPAGO_ENVIRONMENT` | `test` hasta tener credenciales reales; luego `production` |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de Mercado Pago (secreto) |
| `MERCADOPAGO_PUBLIC_KEY` | Public Key de Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | secreto de firma del webhook (secreto) |

Sin las variables de Mercado Pago el sitio funciona, pero PSE queda desactivado y se ofrecen transferencia y WhatsApp.

## 4. Despliegue y dominio

1. **Vercel (recomendado):** importa el repositorio, pega las variables y despliega. En Settings, Domains añade `lasgalletasdetabo.com` y `www.lasgalletasdetabo.com`.
2. **Cloudflare:** añade el dominio, cambia los nameservers en Hostinger por los que indique Cloudflare y crea en DNS los registros que indique Vercel con la nube en gris (solo DNS). En SSL/TLS usa el modo Full (strict).
3. **Cloudflare Workers:** no es posible sin cambios, porque `sharp` no funciona en Workers. Hay que sustituirlo antes de desplegar allí.

## 5. Después de publicar

1. Entra a `https://lasgalletasdetabo.com/admin` y cambia la clave del administrador.
2. En Ajustes completa WhatsApp, Instagram, contacto, textos legales y datos de transferencia.
3. Reemplaza los precios de prueba y las fotos de stock, según el panel de pendientes.
4. En Mercado Pago registra el webhook `https://lasgalletasdetabo.com/api/webhooks/mercadopago`.
5. Revisa `/sitemap.xml` y `/robots.txt` y registra el sitio en Google Search Console.
