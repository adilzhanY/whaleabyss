import { getServiceBySlug, getAllServices } from "@/lib/services";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import CartModal from "@/components/CartModal";
import Link from "next/link";
import ClientServicePage from "./ClientServicePage";

export async function generateStaticParams() {
  const services = await getAllServices();
  return services.map((s) => ({
    slug: s.id,
  }));
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const service = await getServiceBySlug(resolvedParams.slug);

  if (!service) {
    return notFound();
  }

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      {/* We can use the Header but without auth tracking since it uses state, or we just put standard UI header. Wait, Header in page.tsx uses 'use client' and AuthModal.
          We can just put the same page layout here. Actually Next.js layout.tsx wraps everything. But app/page.tsx has Header inside it. 
          Let's create a Client Component to wrap the Client logic (Auth, Header buttons, Cart logic). 
      */}
      <ClientServicePage service={service} />
    </div>
  );
}