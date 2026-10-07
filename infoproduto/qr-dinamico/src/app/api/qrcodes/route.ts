import { NextResponse } from "next/server";
import { createQrSchema, slugifyQrTitle, withShortUrl, type QrLink } from "@/lib/qr";
import { requireUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("qr_links")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json((data as QrLink[]).map((link) => withShortUrl(origin, link)));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createQrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("qr_links")
    .insert({
      title: parsed.data.title,
      destination_url: parsed.data.destination_url,
      slug: slugifyQrTitle(parsed.data.title),
      user_id: auth.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json(withShortUrl(origin, data as QrLink), { status: 201 });
}
