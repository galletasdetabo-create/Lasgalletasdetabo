import Image from "next/image";
import Link from "next/link";
import { Badge, EmptyState, PageHeader, SampleBadge, Table, adminBtn } from "@/components/admin/ui";
import { ProductQuickEdit } from "@/components/admin/ProductQuickEdit";
import { Icon } from "@/components/ui/Icon";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/media";
import { PRODUCT_KIND } from "@/lib/labels";
import { formatCOP } from "@/lib/format";

export default async function ProductsPage(props: PageProps<"/admin/productos">) {
  await requireStaff();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const cat = typeof sp.categoria === "string" ? sp.categoria : "";
  const sample = sp.muestra === "1";
  const db = await createSessionClient();
  let query = db.from("products").select("id, name, slug, price, kind, is_active, is_featured, is_sample, stock_status, track_inventory, stock_quantity, category:categories(id, name), images:product_images(sort, media:media(bucket, path)), variants:product_variants(price)").order("sort").order("created_at");
  if (q) query = query.ilike("name", `%${q.replace(/[%,()]/g, "")}%`);
  if (cat) query = query.eq("category_id", cat);
  if (sample) query = query.eq("is_sample", true);
  const [{ data }, { data: cats }] = await Promise.all([query, db.from("categories").select("id, name").order("sort")]);
  type Row = { id: string; name: string; slug: string; price: number; kind: keyof typeof PRODUCT_KIND; is_active: boolean; is_featured: boolean; is_sample: boolean; stock_status: "disponible" | "agotado" | "bajo_pedido"; track_inventory: boolean; stock_quantity: number | null; category: { name: string } | null; images: { sort: number; media: { bucket: string; path: string } | null }[]; variants: { price: number }[] };
  const products = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Productos e inventario" description="Crea, edita y controla la disponibilidad de tus productos." actions={<Link href="/admin/productos/nuevo" className={adminBtn}><Icon name="plus" size={16} /> Nuevo producto</Link>} />
      <form className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input name="q" defaultValue={q} placeholder="Buscar producto" className="field !min-h-11 sm:max-w-xs" aria-label="Buscar producto" />
        <select name="categoria" defaultValue={cat} className="field !min-h-11 sm:w-64" aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="muestra" value="1" defaultChecked={sample} className="accent-[var(--brand-chocolate)]" /> Solo datos de prueba</label>
        <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-chocolate px-6 text-sm font-semibold text-white">Filtrar</button>
      </form>
      {products.length ? (
        <Table head={["Producto", "Precio", "Disponibilidad e inventario", "Visible", ""]}>
          {products.map((p) => {
            const img = [...p.images].sort((a, b) => a.sort - b.sort)[0]?.media;
            const min = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : p.price;
            return (
              <tr key={p.id} className="align-middle hover:bg-cream/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mist">{img ? <Image src={publicMediaUrl(img.bucket, img.path)} alt="" fill sizes="56px" className="object-cover" quality={60} /> : null}</div>
                    <div>
                      <Link href={`/admin/productos/${p.id}`} className="font-semibold hover:text-rose-deep">{p.name}</Link>
                      <p className="text-xs text-ink-muted">{p.category?.name ?? "Sin categoría"} · {PRODUCT_KIND[p.kind]}</p>
                      <div className="mt-1 flex flex-wrap gap-1">{p.is_sample ? <SampleBadge /> : null}{p.is_featured ? <Badge tone="bg-rose-50 text-rose-800 ring-rose-200">Destacado</Badge> : null}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{p.variants.length > 1 ? "Desde " : ""}{formatCOP(min)}</td>
                <td className="px-4 py-3" colSpan={2}><ProductQuickEdit id={p.id} isActive={p.is_active} stockStatus={p.stock_status} stockQuantity={p.stock_quantity} track={p.track_inventory} /></td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/productos/${p.id}`} className="text-sm text-rose-deep underline">Editar</Link></td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState title="No hay productos" text="Crea tu primer producto para empezar a vender." action={<Link href="/admin/productos/nuevo" className={adminBtn}>Nuevo producto</Link>} />
      )}
    </>
  );
}
