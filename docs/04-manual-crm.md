# Manual del panel administrativo (CRM)

Acceso: `https://TU-DOMINIO/admin`. Solo entran usuarios con rol **Administrador** o **Editor**.

## Panel

Muestra los indicadores de los últimos 30 días:

- Ventas pagadas y ventas no canceladas.
- Pedidos, pendientes y ticket promedio.
- Clientes, productos activos y agotados.
- Sesiones, vistas de producto, productos agregados al carrito, inicios de pago y conversión.

También muestra ventas por día, productos más vendidos, el estado de Mercado Pago, la actividad reciente y la lista **Pendientes de configuración**, con accesos directos a lo que falta para vender con datos reales.

## Comercio

- **Pedidos**: busca por número, nombre o correo y filtra por estado. El detalle muestra:
  - productos, personalización y la imagen de referencia mediante un enlace temporal;
  - datos de entrega e intentos de pago;
  - el historial.

  Desde ahí se cambia el estado (con una nota opcional) y se guardan notas internas. **Cancelar devuelve el inventario reservado.**
- **Productos e inventario**: desde el listado se cambia la disponibilidad, las unidades y la visibilidad. El editor permite gestionar:
  - nombre, URL, descripciones y fotografías, ordenadas desde la biblioteca;
  - precio y precio de promoción, categoría y tipo;
  - variantes con precio propio (por ejemplo «Sabor: Arequipe; Presentación: Caja x6»);
  - campos de personalización (texto, lista, fecha, número, colores, imagen de referencia);
  - inventario, cantidades mínima, máxima y paso, tiempo de preparación y SEO.

  Los productos se pueden **duplicar** y **eliminar**. La casilla «Precio de prueba» muestra un aviso al cliente.
- **Categorías**: nombre, URL, descripción, imagen, orden, visibilidad y SEO.
- **Clientes**: se crean con el primer pedido. Cada ficha muestra el historial, el total comprado y notas internas.
- **Cupones** (solo administrador): porcentaje o valor fijo, vigencia, compra mínima y usos máximos.
- **Métodos de entrega** (solo administrador): tarifa, texto cuando la tarifa es 0, si requiere dirección y orden.
- **Mercado Pago** (solo administrador): estado de la integración, variables pendientes, URL del webhook, activar o desactivar PSE, intentos de pago y notificaciones recibidas con su validación de firma.

## Sitio web

- **Páginas y secciones**: Inicio, Nosotros, Preguntas frecuentes y Contacto se construyen con bloques. Los bloques disponibles son portada, categorías, productos destacados, bloque editorial, historia, galería, pasos, testimonios, Instagram, WhatsApp, preguntas frecuentes, banner y texto libre.

  En cada bloque se edita el texto, las imágenes, los botones, los enlaces y la presentación. Los bloques se reordenan con las flechas, se ocultan, se agregan o se eliminan.

  1. **Guardar borrador**: el cambio no es público todavía.
  2. **Vista previa**: muestra la página con los borradores.
  3. **Publicar cambios**: los aplica al sitio de inmediato.

  Usa `whatsapp:` como enlace de un botón para abrir el chat configurado.
- **Biblioteca de medios**:
  - Subir imágenes JPG, PNG, WebP o AVIF. Se optimizan a WebP y se eliminan los metadatos.
  - Organizar por carpetas y editar el texto alternativo.
  - Marcar fotos de stock con su fuente, autor y licencia.
  - **Sustituir el archivo**, que lo actualiza en todo el sitio.
  - Ver dónde se usa cada imagen. Una imagen en uso no se puede eliminar.
- **Identidad visual**: nombre, eslogan, logotipo, versión alternativa, favicon, los seis colores de marca (aplicados como tokens) y la pareja tipográfica.
- **Información y ajustes**: contacto, redes sociales, WhatsApp (solo administrador), comercio, SEO, pie de página y textos legales. Comercio incluye los datos de transferencia, la nota del checkout y la barra de aviso. **Los campos vacíos no se muestran en el sitio.**
- **Mensajes**: lo que llega desde el formulario de contacto.

## Seguridad

- **Usuarios y roles** (solo administrador): crear miembros del equipo y cambiar roles. Siempre debe existir al menos un administrador.
- **Registro de actividad**: quién hizo qué y cuándo.

## Reemplazar los datos provisionales

1. **Productos**: ajusta los precios reales y desmarca «Precio de prueba». Filtra con «Solo datos de prueba».
2. **Fotografías**: en Medios, filtra «Solo fotos de stock» y usa **Sustituir archivo** con tus fotos reales; la marca de stock se quita sola.
3. **Historia y textos**: revisa los bloques marcados como «texto provisional».
4. **Testimonios**: agrega testimonios reales autorizados y activa el bloque.
5. **Contacto, WhatsApp, Instagram y textos legales**: completa en Ajustes y verifica cada número y enlace antes de guardar.
6. **Barra de aviso**: desactívala en Ajustes › Comercio cuando la tienda esté lista.
