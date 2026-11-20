# Mercado Pago · PSE

## Producto elegido

**Checkout API vía Orders** (`POST /v1/orders`), que es la integración vigente que Mercado Pago documenta para PSE en Colombia. La integración por Payments API figura como «legacy».

Fuentes consultadas el 18–19/11/2026:

- PSE (Orders): https://www.mercadopago.com.co/developers/es/docs/checkout-api-orders/payment-integration/websites/pse
- Webhooks: https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
- Estados: https://www.mercadopago.com.co/developers/es/docs/checkout-api-orders/payment-management/status/transaction-status
- Pruebas PSE: https://www.mercadopago.com.co/developers/es/docs/checkout-api-orders/integration-test/pse
- La firma del webhook se verificó contra el código del SDK oficial `mercadopago` 3.6.2 (`WebhookSignatureValidator`).

## Flujo

1. El cliente completa el checkout y elige PSE (tipo de persona, documento y banco).
2. El servidor crea el pedido con `create_order`, que recalcula precios.
3. Se registra un intento en `payments` con una clave de idempotencia (UUID) y se llama a `POST /v1/orders` con la cabecera `X-Idempotency-Key`.
4. El cliente es redirigido a `transactions.payments[0].payment_method.redirect_url`, el flujo seguro de su banco.
5. Mercado Pago envía un webhook (tópico `order`) a `/api/webhooks/mercadopago`.
6. El endpoint valida la firma, registra el evento, deduplica por `x-request-id`, consulta `GET /v1/orders/{id}` y aplica el estado con reglas de precedencia: un pago aprobado nunca retrocede.
7. Cuando el cliente vuelve a `/pedido/{token}?pago=retorno`, el servidor vuelve a consultar la API. **Volver a la URL de éxito no marca nada como pagado.**
8. Un pago aprobado pasa el pedido de «pendiente» a «confirmado». Ante un rechazo, cancelación o expiración, el cliente puede reintentar, lo que crea un nuevo intento y una nueva orden en Mercado Pago.

## Variables de entorno

| Variable | Uso |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de la aplicación. Solo servidor. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Clave secreta generada en Tus integraciones › Webhooks. |
| `MERCADOPAGO_ENVIRONMENT` | `test` o `production`. Se muestra en el CRM y se guarda en cada pago. |
| `MERCADOPAGO_PUBLIC_KEY` | Opcional; no se usa en PSE. Reservada para tarjetas. |
| `MERCADOPAGO_API_BASE` | Solo pruebas automatizadas: dirige las llamadas al simulador local. Se ignora en producción. |

El CRM (Mercado Pago) muestra el estado: **sin configurar**, **configurado en pruebas**, **configurado en producción** o **error de conexión**. Lo verifica consultando `GET /v1/payment_methods`.

## Estados

| Orders API | Estado interno |
|---|---|
| `processed` / `accredited` | aprobado |
| `action_required` (`waiting_transfer`), `created` | pendiente |
| `processing`, `in_review` | en proceso |
| `failed` | rechazado |
| `canceled` | cancelado |
| `expired` | expirado |
| `refunded`, `charged_back` | reembolsado |

## Cómo conectar la cuenta real

1. Crear la aplicación en https://www.mercadopago.com.co/developers/panel (producto: Checkout API / pagos online).
2. **Pruebas**: copiar las credenciales de prueba y crear cuentas de prueba de vendedor y comprador de Colombia (Tus integraciones › Cuentas de prueba).
3. Configurar en el hosting `MERCADOPAGO_ENVIRONMENT=test`, `MERCADOPAGO_ACCESS_TOKEN` y `NEXT_PUBLIC_SITE_URL`, que debe ser HTTPS pública.
4. En Tus integraciones › Webhooks, registrar `https://TU-DOMINIO/api/webhooks/mercadopago` con el evento **Order (Mercado Pago)** en modo pruebas. Copiar la clave secreta en `MERCADOPAGO_WEBHOOK_SECRET` y volver a desplegar.
5. Abrir el CRM › Mercado Pago, confirmar «Configurado en pruebas» y hacer una compra con el simulador «Banco Prueba PSE» en cada escenario: aprobación, abandono y fondos insuficientes.
6. **Producción**: cambiar a las credenciales productivas, `MERCADOPAGO_ENVIRONMENT=production`, registrar el webhook en modo productivo con su clave y volver a desplegar.

## Pendiente de validar con credenciales reales

Sin cuenta del cliente no fue posible llamar a la API real. Estos puntos se implementaron según la documentación y deben confirmarse en el sandbox:

- El formato exacto de `payer.phone` (`area_code` / `number`): se envían los 3 primeros dígitos del celular como `area_code` y el resto como `number`.
- Si `payer.address.zip_code` es obligatorio. Si el cliente no lo indica, se envía `000000`.
- El valor exacto del tópico en el cuerpo del webhook (`type`/`action`). El endpoint acepta `order` y `order.*` y responde 200 a los demás tópicos sin procesarlos.
- El monto mínimo de PSE. El simulador usa 1.600 COP, tomado del ejemplo de la documentación, que no lo garantiza.

## Simulador local (solo pruebas)

`scripts/mp-simulator.mjs` reproduce `GET /v1/payment_methods`, `POST/GET /v1/orders` con idempotencia, una página de banco para aprobar o rechazar, y webhooks firmados con el mismo algoritmo HMAC. Se usó en las pruebas E2E. **No procesa dinero ni representa transacciones reales.**
