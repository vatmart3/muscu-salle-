import { NextResponse, type NextRequest } from "next/server";
import { clientServeur } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await clientServeur();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/connexion", request.nextUrl.origin), { status: 303 });
}
