import { NextResponse } from "next/server";
import { getBalance } from "@/lib/asaas";
import { requireStaffUser } from "@/lib/apiAuth";

export async function GET(request: Request) {
  const staff = await requireStaffUser(request);
  if (staff.error) return staff.error;
  try {
    const balance = await getBalance();
    return NextResponse.json(balance);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
