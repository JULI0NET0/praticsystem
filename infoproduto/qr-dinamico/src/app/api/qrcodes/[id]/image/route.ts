import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { buildShortUrl, type QrLink } from "@/lib/qr";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("qr_links").select("slug").eq("id", id).maybeSingle<Pick<QrLink, "slug">>();

  if (!data) {
    return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const png = await QRCode.toBuffer(buildShortUrl(origin, data.slug), { width: 512, margin: 2 });
  // O PNG só contém a URL curta. O destino pode mudar sem invalidar esta imagem.

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
