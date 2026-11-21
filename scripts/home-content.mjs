// Contenido inicial de la página de inicio (editable después desde el CRM).
// Orden: portada, historia, frase, líneas de producto, destacados, galería, lista con parallax,
// cronología, pasos, bloque dividido, testimonios, Instagram y WhatsApp.
// Los textos hablan desde la experiencia (celebrar, sorprender, compartir) y no desde "vendemos".
export function homeSections(ids) {
  const img = (s) => ids[s] ?? null;
  const gallery = ["letra-r-globo-estrellas", "letra-v-globo-cumpleanos-tartaletas", "rosas-letra-galleta-frutas", "alfajores-colores-capacillos", "letra-globo-negro-feliz-cumpleanos", "cajas-alfajores-lazos-azul-plata", "letra-v-globo-rosado"]
    .map(img).filter(Boolean).map((image) => ({ image }));
  const insta = ["numero-50-cumpleanos", "cajas-alfajores-surtidas", "letra-fruta-tablero-plateado", "dia-de-la-madre-rosas-letra", "letra-m-globo-fucsia"]
    .map(img).filter(Boolean).map((image) => ({ image }));
  return [
    { type: "hero", label: "Portada", variant: "slider", content: {
      slides: [
        { bg: img("hero-fondo-3"), image: img("hero-producto-3"), eyebrow: "Sorpresas que celebran", title: "Momentos especiales",
          text: "Detalles únicos y personalizados para cumpleaños, aniversarios y fechas inolvidables.",
          cta_primary_label: "Crea tu detalle", cta_primary_href: "/tienda/galletas-personalizadas" },
        { bg: img("hero-fondo-2"), image: img("hero-producto-2"), eyebrow: "Amor en cada detalle", title: "Aniversarios inolvidables",
          text: "Detalles dulces y personalizados para celebrar el amor y las fechas que merecen recordarse.",
          cta_primary_label: "Crea tu detalle", cta_primary_href: "/tienda" },
        { bg: img("hero-fondo-1"), image: img("hero-producto-1"), eyebrow: "Regalos que enamoran", title: "Alfajores artesanales",
          text: "Cajas de alfajores rellenos de dulce de leche, con el lazo que elijas y listas para regalar.",
          cta_primary_label: "Pedir alfajores", cta_primary_href: "/tienda/alfajores-artesanales" },
      ].filter((s) => s.image && s.bg) } },
    { type: "story", label: "Historia de la marca (texto provisional)", variant: "default", content: {
      eyebrow: "hecho en casa", title: "Nuestra historia",
      text: "En Las Galletas de Tabo creemos que cada celebración merece un detalle que se recuerde. Desde una cocina de casa convertimos cumpleaños, aniversarios y días especiales en momentos llenos de color, sabor y cariño, con letras y números con frutas, galletas decoradas y alfajores hechos a mano para quien más quieres.",
      quote: "Horneando con amor", image: img("fondo-historia") } },
    { type: "quote", label: "Frase", variant: "default", content: { text: "Cada detalle cuenta una historia, hecha con amor.", image: img("fondo-frase") } },
    { type: "categories", label: "Dos formas de celebrar", variant: "default", content: {
      eyebrow: "celebra a tu manera", title: "Dos formas de celebrar", intro: "Elige el detalle que mejor cuente lo que quieres decir: galletas decoradas para cada ocasión o alfajores suaves para compartir en familia.",
      items: [
        { title: "Galletas personalizadas", text: "Para cumpleaños, aniversarios y eventos", image: img("galleta-recorte"), href: "/tienda/galletas-personalizadas", link_label: "Ver galletas" },
        { title: "Alfajores artesanales", text: "Para regalar y compartir", image: img("alfajor-recorte"), href: "/tienda/alfajores-artesanales", link_label: "Ver alfajores" },
      ] } },
    { type: "featured_products", label: "Los detalles más pedidos", variant: "grid", content: {
      eyebrow: "ideas para sorprender", title: "Los detalles más pedidos", intro: "Inspírate con lo que más celebramos: cumpleaños, aniversarios y el Día de la Madre. Cada detalle se prepara a mano y por encargo.", source: "featured", limit: 6, cta_label: "Ver todos los detalles", cta_href: "/tienda" } },
    { type: "gallery", label: "Galería", variant: "mosaic", content: { eyebrow: "momentos que celebramos", title: "Galería de celebraciones", images: gallery } },
    { type: "menu_list", label: "Delicias de la casa", variant: "image-right", content: {
      title: "Pura delicia", source: "dulces", limit: 4, image: img("fondo-menu-marmol"), plate: img("plato-corazon"), cta_label: "Ver tienda", cta_href: "/tienda" } },
    { type: "timeline", label: "Tradición (textos provisionales: confirmar años e historia)", variant: "default", content: {
      eyebrow: "nuestra", title: "Tradición",
      intro: "El arte de elaborar detalles que combinan recetas tradicionales, ingredientes de calidad y un toque de alegría en cada creación.",
      image: img("fondo-tradicion"),
      items: [
        { year: "2018", label: "La receta familiar", title: "Nuestros inicios", text: "Todo comenzó con una receta casera, la ilusión de compartir algo especial y la pasión por la repostería. Con el tiempo, esa tradición se convirtió en una variedad de galletas y alfajores que hoy endulzan momentos únicos." },
        { year: "2019", label: "Primeras creaciones", title: "Primeras creaciones", text: "Los primeros diseños y sabores que salieron de nuestra cocina, hechos a mano y con mucho cuidado." },
        { year: "2021", label: "Más variedad de galletas", title: "Más variedad", text: "Fuimos sumando formas, colores y sabores para acompañar cada celebración." },
        { year: "2023", label: "Nuevas presentaciones", title: "Nuevas presentaciones", text: "Llegaron las cajas de regalo y las presentaciones pensadas para sorprender." },
        { year: "2025", label: "Seguimos endulzando momentos", title: "Seguimos endulzando momentos", text: "Seguimos horneando con amor para endulzar los momentos que más importan." },
      ] } },
    { type: "steps", label: "Cómo pedir", variant: "default", content: {
      eyebrow: "así de fácil", title: "Cómo pedir", intro: "Vivir la experiencia es sencillo: eliges, nos cuentas tu idea y nosotros la convertimos en un detalle para celebrar. Todo se prepara por encargo.",
      items: [
        { title: "Elige tu detalle", text: "Explora la tienda y escoge la letra, la caja, las galletas o los alfajores que mejor cuenten tu celebración." },
        { title: "Cuéntanos tu idea", text: "Dinos la ocasión, el nombre, los colores y la fecha en que lo necesitas." },
        { title: "Confirma tu pedido", text: "Completa tus datos y elige cómo pagar: PSE, transferencia o WhatsApp." },
        { title: "Celebra", text: "Te avisamos cuando tu detalle esté listo para la entrega y a disfrutar el momento." },
      ], cta_label: "Empezar mi pedido", cta_href: "/tienda" } },
    { type: "feature_split", label: "Galletas personalizadas", variant: "image-left", content: {
      eyebrow: "diseñado contigo", title: "Galletas personalizadas para cada celebración",
      text: "Tú nos cuentas la ocasión y nosotros creamos un detalle único para sorprender: letras, números, galletas decoradas con nombres, flores, iniciales o mensajes, todo hecho a mano.",
      bullets: [{ text: "Diseño a la medida de tu ocasión" }, { text: "Nombres, edades, fechas y mensajes cortos" }, { text: "Los colores de tu celebración" }, { text: "Sube una imagen de referencia al pedir" }],
      image: img("letra-m-globo-fucsia"), cta_label: "Personalizar mi detalle", cta_href: "/producto/galletas-personalizadas-a-tu-gusto" } },
    { type: "testimonials", label: "Testimonios (agregar testimonios reales)", variant: "default", enabled: false, content: { eyebrow: "lo que dicen de nosotros", title: "Testimonios", items: [] } },
    { type: "instagram", label: "Instagram", variant: "default", content: { eyebrow: "síguenos", title: "Celebraciones en Instagram", text: "Inspírate con nuestros detalles más recientes y comparte tu celebración con nosotros.", images: insta } },
    { type: "whatsapp_cta", label: "Pedidos por WhatsApp", variant: "default", content: {
      eyebrow: "¿tienes una idea especial?", title: "Escríbenos por WhatsApp", text: "Cuéntanos tu celebración y te ayudamos a diseñar el detalle perfecto, paso a paso, por WhatsApp.",
      button_label: "Pedir por WhatsApp", message: "¡Hola! Quiero hacer un pedido en Las Galletas de Tabo.", image: img("letra-globo-negro-feliz-cumpleanos") } },
  ];
}
