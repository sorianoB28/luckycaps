import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";

const ALLOWED_STATUSES = ["created", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

const isEmailLike = (value: string) => value.includes("@");

const parseCursor = (cursor?: string | null) => {
  if (!cursor) return null;
  const [created, id] = cursor.split("|");
  if (!created || !id) return null;
  return { created_at: created, id };
};

export async function GET(request: Request) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as OrderStatus | null;
    const q = searchParams.get("q")?.trim() ?? "";
    const sort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const cursorParam = parseCursor(searchParams.get("cursor"));

    const whereParts: string[] = [];
    const params: unknown[] = [];

    if (status && ALLOWED_STATUSES.includes(status)) {
      params.push(status);
      whereParts.push(`o.status = $${params.length}::text`);
    }

    if (q) {
      if (isEmailLike(q)) {
        params.push(q);
        whereParts.push(`LOWER(o.email) = LOWER($${params.length})`);
      } else {
        params.push(`${q}%`);
        whereParts.push(`o.id::text ILIKE $${params.length}`);
      }
    }

    if (cursorParam) {
      params.push(cursorParam.created_at);
      params.push(cursorParam.id);
      const createdIdx = params.length - 1;
      const idIdx = params.length;
      if (sort === "oldest") {
        whereParts.push(
          `(o.created_at, o.id) > ($${createdIdx}::timestamptz, $${idIdx}::uuid)`
        );
      } else {
        whereParts.push(
          `(o.created_at, o.id) < ($${createdIdx}::timestamptz, $${idIdx}::uuid)`
        );
      }
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    const orderClause =
      sort === "oldest"
        ? "ORDER BY o.created_at ASC, o.id ASC"
        : "ORDER BY o.created_at DESC, o.id DESC";
    const limitValue = limit + 1;
    params.push(limitValue);

    const queryText = `
      SELECT
        o.id,
        o.created_at,
        o.status,
        o.email,
        o.user_id,
        o.customer_name,
        o.customer_phone,
        o.subtotal_cents,
        COALESCE(items.items_count, 0) AS items_count
      FROM public.orders o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(oi.quantity), 0)::int AS items_count
        FROM public.order_items oi
        WHERE oi.order_id = o.id
      ) items ON true
      ${whereClause}
      ${orderClause}
      LIMIT $${params.length}
    `;

    if (process.env.NODE_ENV !== "production") {
      console.log({
        sqlText: queryText,
        params,
      });
    }

    const rows = (await sql(queryText, params)) as Array<{
      id: string;
      created_at: string;
      status: string;
      email: string;
      subtotal_cents: number;
      items_count: number;
    }>;

    const hasNext = rows.length > limit;
    const trimmed = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext
      ? `${trimmed[trimmed.length - 1].created_at}|${trimmed[trimmed.length - 1].id}`
      : null;

    return NextResponse.json({ orders: trimmed, nextCursor });
  } catch (err) {
    console.error("Admin orders fetch failed", err);
    return NextResponse.json({ error: "Unable to load orders" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
