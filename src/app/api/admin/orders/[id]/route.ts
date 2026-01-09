import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";

const ALLOWED_STATUSES = ["created", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

const statusTimestampColumn: Partial<Record<OrderStatus, string>> = {
  paid: "paid_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
  refunded: "refunded_at",
};

const parseJson = <T,>(value: unknown, fallback: T) => {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const orderSelectFieldsText = `
  o.id,
  o.email,
  o.status,
  o.subtotal_cents,
  o.user_id,
  u.email AS account_email,
  NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), '') AS account_name,
  o.customer_name,
  o.customer_phone,
  o.contact,
  o.shipping_address,
  o.delivery_option,
  o.promo_code,
  o.tracking_number,
  o.admin_notes,
  o.created_at,
  o.updated_at,
  o.paid_at,
  o.shipped_at,
  o.delivered_at,
  o.cancelled_at,
  o.refunded_at
`;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!params.id || !/^[0-9a-fA-F-]{36}$/.test(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const orderRows = await sql(
      `
      SELECT
        ${orderSelectFieldsText}
      FROM public.orders o
      LEFT JOIN public.users u ON u.id = o.user_id
      WHERE o.id = $1::uuid
      LIMIT 1
    `,
      [params.id]
    );

    const order = orderRows[0];
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const items = await sql(
      `
      SELECT
        oi.product_slug,
        oi.name,
        oi.image_url,
        oi.price_cents,
        oi.variant,
        oi.size,
        oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = $1::uuid
      ORDER BY oi.created_at ASC
    `,
      [params.id]
    );

    type StatsRow = { first_order_at: string | null; order_count: number };
    let stats: StatsRow[] = [{ first_order_at: null, order_count: 1 }];
    if (order.user_id) {
      stats = (await sql(
        `
        SELECT
          MIN(created_at) AS first_order_at,
          COUNT(*)::int AS order_count
        FROM public.orders
        WHERE user_id = $1
      `,
        [order.user_id]
      )) as unknown as StatsRow[];
    } else if (order.email) {
      stats = (await sql(
        `
        SELECT
          MIN(created_at) AS first_order_at,
          COUNT(*)::int AS order_count
        FROM public.orders
        WHERE LOWER(email) = LOWER($1)
      `,
        [order.email]
      )) as unknown as StatsRow[];
    }

    const shipmentRows = (await sql(
      `
        SELECT *
        FROM public.shipments
        WHERE order_id = $1::uuid
        LIMIT 1
      `,
      [params.id]
    )) as Array<Record<string, unknown>>;

    const shipment = shipmentRows[0] ?? null;
    if (shipment) {
      shipment.parcel = parseJson(shipment.parcel, null);
      shipment.rates = parseJson(shipment.rates, []);
      shipment.selected_rate = parseJson(shipment.selected_rate, null);
    }

    return NextResponse.json({
      order: {
        ...order,
        first_order_at: stats?.[0]?.first_order_at ?? null,
        order_count: stats?.[0]?.order_count ?? 1,
      },
      items,
      shipment,
    });
  } catch (err) {
    console.error("Admin order fetch failed", err);
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
}

type PatchPayload = {
  status?: OrderStatus;
  tracking_number?: string | null;
  admin_notes?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!params.id || !/^[0-9a-fA-F-]{36}$/.test(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let body: PatchPayload;
    try {
      body = (await request.json()) as PatchPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const setParts: string[] = [];
    const values: any[] = [];

    if (body.status) {
      if (!ALLOWED_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      values.push(body.status);
      setParts.push(`status = $${values.length}`);
      const tsColumn = statusTimestampColumn[body.status];
      if (tsColumn === "paid_at") {
        setParts.push("paid_at = COALESCE(paid_at, now())");
      } else if (tsColumn === "shipped_at") {
        setParts.push("shipped_at = COALESCE(shipped_at, now())");
      } else if (tsColumn === "delivered_at") {
        setParts.push("delivered_at = COALESCE(delivered_at, now())");
      } else if (tsColumn === "cancelled_at") {
        setParts.push("cancelled_at = COALESCE(cancelled_at, now())");
      } else if (tsColumn === "refunded_at") {
        setParts.push("refunded_at = COALESCE(refunded_at, now())");
      }
    }

    if (body.tracking_number !== undefined) {
      const tracking = body.tracking_number?.trim() || null;
      values.push(tracking);
      setParts.push(`tracking_number = $${values.length}`);
    }

    if (body.admin_notes !== undefined) {
      const notes = body.admin_notes?.trim() || null;
      values.push(notes);
      setParts.push(`admin_notes = $${values.length}`);
    }

    setParts.push("updated_at = now()");

    if (!setParts.length) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    values.push(params.id);

    const updated = await sql(
      `
      UPDATE public.orders o
      SET ${setParts.join(", ")}
      WHERE o.id = $${values.length}::uuid
      RETURNING o.id
    `,
      values
    );

    const updatedId = updated[0]?.id;
    if (!updatedId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.status === "paid") {
      try {
        await sql(
          `
            INSERT INTO public.shipments (order_id, provider, status, rates)
            VALUES ($1::uuid, 'shippo', 'draft', '[]'::jsonb)
            ON CONFLICT (order_id) DO NOTHING
          `,
          [params.id]
        );
      } catch (err) {
        console.error("Unable to create shipment draft", err);
      }
    }

    const orderRows = await sql(
      `
      SELECT
        ${orderSelectFieldsText}
      FROM public.orders o
      LEFT JOIN public.users u ON u.id = o.user_id
      WHERE o.id = $1::uuid
      LIMIT 1
    `,
      [params.id]
    );

    const order = orderRows[0];
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ order });
  } catch (err) {
    console.error("Admin order update failed", err);
    return NextResponse.json({ error: "Unable to update order" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
