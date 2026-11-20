import type { Metadata } from "next";
import { SectionList } from "@/components/sections/Sections";
import { getSections } from "@/lib/data/public";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const sections = await getSections("home");
  return <SectionList sections={sections} />;
}
