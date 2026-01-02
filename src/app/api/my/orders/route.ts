import { NextResponse } from "next/server";

import { requireUser } from "@/lib/adminAuth";
import sql from "@/lib/db";

type OrderRow = {
  id: string;
  status: string;
  subtotal_cents: number;
  created_at: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price_cents: number;
    image_url: string | null;
  }[];
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { response, session } = await requireUser();
  if (response || !session?.user?.email) return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase();

  const rows = (await sql`
    SELECT
      o.id,
      o.status,
      o.subtotal_cents,
      o.created_at,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id,
              'name', oi.name,
              'quantity', oi.quantity,
              'price_cents', oi.price_cents,
              'image_url', oi.image_url
            )
            ORDER BY oi.created_at DESC
          )
          FROM public.order_items oi
          WHERE oi.order_id = o.id
        ),
        '[]'::json
      ) AS items
    FROM public.orders o
    WHERE lower(o.email) = ${email}
    ORDER BY o.created_at DESC
  `) as unknown as OrderRow[];

  return NextResponse.json(rows);
}
