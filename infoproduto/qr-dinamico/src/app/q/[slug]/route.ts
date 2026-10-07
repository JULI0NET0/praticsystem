import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { QrLink } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: link } = await supabase
    .from("qr_links")
    .select("id, destination_url, is_active")
    .eq("slug", slug)
    .maybeSingle<Pick<QrLink, "id" | "destination_url" | "is_active">>();

  const unavailable = NextResponse.redirect(new URL("/q/indisponivel", request.url));

  if (!link || !link.is_active || !/^https?:\/\//i.test(link.destination_url)) {
    return unavailable;
  }

  const counted = await supabase.rpc("increment_qr_click", { link_id: link.id });
  if (counted.error) {
    console.error(counted.error.message);
  }

  // 307 e sem cache: um 301 ficaria gravado no celular e o QR deixaria de ser dinâmico.
  return NextResponse.redirect(link.destination_url, {
    status: 307,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
