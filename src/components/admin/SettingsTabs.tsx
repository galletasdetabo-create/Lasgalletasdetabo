"use client";
import { CheckField, SettingsForm, TextField } from "./SettingsForm";
import { MediaField } from "./MediaPicker";
import { normalizeWhatsApp, type SiteSettings } from "@/lib/cms/settings";

export function SettingsTabs({ tab, settings: s, isAdmin }: { tab: string; settings: SiteSettings; isAdmin: boolean }) {
  switch (tab) {
    case "redes":
      return (
        <SettingsForm settingKey="social" initial={s.social}>
          {(v, set) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Instagram (usuario o URL)" value={v.instagram} onChange={(x) => set("instagram", x)} help="Ej. @lasgalletasdetabo. Activa la sección de Instagram." />
              <TextField label="Facebook (usuario o URL)" value={v.facebook} onChange={(x) => set("facebook", x)} />
              <TextField label="TikTok (usuario o URL)" value={v.tiktok} onChange={(x) => set("tiktok", x)} />
            </div>
          )}
        </SettingsForm>
      );
    case "whatsapp":
      return (
        <SettingsForm settingKey="whatsapp" initial={s.whatsapp} disabled={!isAdmin}>
          {(v, set) => (
            <div className="grid gap-4">
              <CheckField label="Habilitar pedidos y botones de WhatsApp" checked={v.enabled} onChange={(x) => set("enabled", x)} />
              <TextField label="Número de WhatsApp" value={v.number} onChange={(x) => set("number", x)} help={v.number ? `Enlace: https://wa.me/${normalizeWhatsApp(v.number)} — verifica que sea correcto antes de guardar.` : "Celular colombiano de 10 dígitos o con indicativo (+57). Sin número no se muestran botones de WhatsApp."} />
              <TextField label="Mensaje predeterminado" value={v.default_message} onChange={(x) => set("default_message", x)} textarea max={500} />
            </div>
          )}
        </SettingsForm>
      );
    case "comercio":
      return (
        <SettingsForm settingKey="commerce" initial={s.commerce}>
          {(v, set) => (
            <div className="grid gap-4">
              <TextField label="Instrucciones para transferencia" value={v.transfer_instructions} onChange={(x) => set("transfer_instructions", x)} textarea rows={5} max={3000} help="Banco, tipo y número de cuenta, titular, etc. Se muestran al cliente después de confirmar un pedido con transferencia. Vacío = «te enviaremos los datos de pago»." />
              <TextField label="Nota en el checkout" value={v.checkout_note} onChange={(x) => set("checkout_note", x)} textarea max={600} />
              <CheckField label="Mostrar barra de aviso superior" checked={v.notice_enabled} onChange={(x) => set("notice_enabled", x)} />
              <TextField label="Texto del aviso" value={v.notice_text} onChange={(x) => set("notice_text", x)} max={200} />
            </div>
          )}
        </SettingsForm>
      );
    case "seo":
      return (
        <SettingsForm settingKey="seo" initial={s.seo}>
          {(v, set) => (
            <div className="grid gap-4">
              <TextField label="Título del sitio" value={v.title} onChange={(x) => set("title", x)} max={70} help={`${v.title.length}/70 caracteres`} />
              <TextField label="Descripción" value={v.description} onChange={(x) => set("description", x)} textarea max={170} />
              <TextField label="Palabras clave (separadas por coma)" value={v.keywords} onChange={(x) => set("keywords", x)} />
              <MediaField label="Imagen para compartir en redes (1200×630 recomendado)" value={v.og_image_id} onChange={(x) => set("og_image_id", x)} folder="marca" />
            </div>
          )}
        </SettingsForm>
      );
    case "footer":
      return (
        <SettingsForm settingKey="footer" initial={s.footer}>
          {(v, set) => (
            <div className="grid gap-4">
              <TextField label="Texto del pie de página" value={v.text} onChange={(x) => set("text", x)} textarea max={400} />
              <TextField label="Titular de derechos (copyright)" value={v.copyright} onChange={(x) => set("copyright", x)} help="Vacío = nombre de la marca." />
            </div>
          )}
        </SettingsForm>
      );
    case "legal":
      return (
        <SettingsForm settingKey="legal" initial={s.legal}>
          {(v, set) => (
            <div className="grid gap-5">
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Redacta estos textos con asesoría legal (Ley 1581 de 2012 de protección de datos y Estatuto del Consumidor). Las páginas vacías no se enlazan en el sitio.</p>
              <TextField label="Política de privacidad y tratamiento de datos" value={v.privacy} onChange={(x) => set("privacy", x)} textarea rows={8} max={30000} />
              <TextField label="Términos y condiciones" value={v.terms} onChange={(x) => set("terms", x)} textarea rows={8} max={30000} />
              <TextField label="Envíos y entregas" value={v.shipping} onChange={(x) => set("shipping", x)} textarea rows={6} max={30000} />
              <TextField label="Cambios y devoluciones" value={v.returns} onChange={(x) => set("returns", x)} textarea rows={6} max={30000} />
            </div>
          )}
        </SettingsForm>
      );
    default:
      return (
        <SettingsForm settingKey="contact" initial={s.contact}>
          {(v, set) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Teléfono" value={v.phone} onChange={(x) => set("phone", x)} />
              <TextField label="Correo electrónico" type="email" value={v.email} onChange={(x) => set("email", x)} />
              <TextField label="Ciudad" value={v.city} onChange={(x) => set("city", x)} />
              <TextField label="Zona de cobertura" value={v.service_area} onChange={(x) => set("service_area", x)} help="Ej. barrios o ciudades donde entregan." />
              <TextField label="Horario de atención" value={v.hours} onChange={(x) => set("hours", x)} />
              <TextField label="Dirección" value={v.address} onChange={(x) => set("address", x)} help="El negocio opera desde casa: solo se muestra si activas la opción." />
              <CheckField label="Mostrar la dirección en el sitio" checked={v.show_address} onChange={(x) => set("show_address", x)} />
            </div>
          )}
        </SettingsForm>
      );
  }
}
