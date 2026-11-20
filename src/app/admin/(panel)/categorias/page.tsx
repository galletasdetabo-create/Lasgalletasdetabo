import { PageHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default async function CategoriesPage() {
  await requireStaff();
  const db = await createSessionClient();
  const [{ data }, { data: prods }] = await Promise.all([db.from("categories").select("*").order("sort"), db.from("products").select("category_id")]);
  const counts: Record<string, number> = {};
  (prods ?? []).forEach((p) => p.category_id && (counts[p.category_id] = (counts[p.category_id] ?? 0) + 1));
  return (
    <>
      <PageHeader title="Categorías" description="Organiza la tienda. El orden define cómo aparecen en el menú y en los filtros." />
      <CategoryManager categories={(data ?? []) as Category[]} counts={counts} />
    </>
  );
}
