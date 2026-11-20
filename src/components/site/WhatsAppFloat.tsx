import { Icon } from "@/components/ui/Icon";
import { getSettings } from "@/lib/data/public";
import { whatsappLink } from "@/lib/cms/settings";

export async function WhatsAppFloat() {
  const s = await getSettings();
  const href = s.whatsapp.enabled ? whatsappLink(s.whatsapp.number, s.whatsapp.default_message) : null;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Pedir por WhatsApp"
      className="fixed bottom-6 right-6 z-30 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_-10px_rgba(37,211,102,0.8)] transition-transform duration-300 hover:-translate-y-1"
    >
      <Icon name="whatsapp" size={26} strokeWidth={1.8} />
    </a>
  );
}
