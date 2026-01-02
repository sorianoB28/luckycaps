import { NextResponse } from "next/server";

import sql from "@/lib/db";

type RouteParams = {
  params: { id: string };
};

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = params;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
  }

  let body: { voter_key?: string | null };
  try {
    body = (await request.json()) as { voter_key?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const voterKey = body.voter_key?.trim();

  if (!voterKey) {
    return NextResponse.json(
      { error: "voter_key is required" },
      { status: 400 }
    );
  }

  const reviewRows = (await sql`
    SELECT id, helpful_count
    FROM public.reviews
    WHERE id = ${id}::uuid
    LIMIT 1
  `) as unknown as { id: string; helpful_count: number }[];

  if (!reviewRows.length) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const resultRows = (await sql`
    WITH inserted AS (
      INSERT INTO public.review_helpful_votes (review_id, voter_key)
      VALUES (${id}::uuid, ${voterKey})
      ON CONFLICT (review_id, voter_key) DO NOTHING
      RETURNING review_id
    ),
    updated AS (
      UPDATE public.reviews
      SET helpful_count = helpful_count + 1
      WHERE id = ${id}::uuid AND EXISTS (SELECT 1 FROM inserted)
      RETURNING helpful_count
    )
    SELECT
      EXISTS (SELECT 1 FROM inserted) AS counted,
      COALESCE(
        (SELECT helpful_count FROM updated LIMIT 1),
        (SELECT helpful_count FROM public.reviews WHERE id = ${id}::uuid LIMIT 1)
      ) AS helpful_count
  `) as unknown as { counted: boolean; helpful_count: number | null }[];

  const result = resultRows[0];

  return NextResponse.json({
    ok: true,
    counted: Boolean(result?.counted),
    helpful_count: result?.helpful_count ?? reviewRows[0].helpful_count,
  });
}
