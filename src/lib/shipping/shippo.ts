import "server-only";

type ShippoAddress = {
  name?: string;
  company?: string;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
  email?: string | null;
};

export type ShippoParcel = {
  length: number;
  width: number;
  height: number;
  distance_unit: string;
  weight: number;
  mass_unit: string;
};

export type ShippoRate = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  service: string;
  service_token?: string | null;
  estimated_days?: number | null;
  duration_terms?: string | null;
};

export type ShippoPurchase = {
  label_url: string;
  tracking_number: string;
  tracking_url: string | null;
  postage_amount: number | null;
};

function resolveShippoToken() {
  const testToken = process.env.SHIPPO_TEST_TOKEN;
  const liveToken = process.env.SHIPPO_API_TOKEN;
  if (testToken && process.env.NODE_ENV !== "production") return testToken;
  return liveToken || testToken || null;
}

async function shippoFetch<T>(path: string, body: Record<string, unknown>) {
  const token = resolveShippoToken();
  if (!token) {
    throw new Error("Missing Shippo API token");
  }

  const res = await fetch(`https://api.goshippo.com/${path}`, {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as T & { detail?: string; messages?: Array<{ text?: string }> };
  if (!res.ok) {
    const message = json?.detail || json?.messages?.[0]?.text || `Shippo error (${res.status})`;
    throw new Error(message);
  }
  return json;
}

function normalizeRate(rate: any): ShippoRate | null {
  if (!rate?.object_id) return null;
  const amount = Number(rate.amount);
  return {
    id: String(rate.object_id),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: rate.currency || "USD",
    provider: rate.provider || "Unknown",
    service: rate.servicelevel?.name || rate.servicelevel?.token || "Service",
    service_token: rate.servicelevel?.token || null,
    estimated_days: rate.estimated_days ?? null,
    duration_terms: rate.duration_terms ?? null,
  };
}

export async function createShipmentDraft(params: {
  ship_from: ShippoAddress;
  ship_to: ShippoAddress;
  parcel: ShippoParcel;
}) {
  const { ship_from, ship_to, parcel } = params;
  const response = await shippoFetch<any>("shipments", {
    address_from: ship_from,
    address_to: ship_to,
    parcels: [parcel],
    async: false,
  });

  const rates = Array.isArray(response?.rates)
    ? response.rates.map(normalizeRate).filter(Boolean)
    : [];

  return {
    provider_shipment_id: String(response?.object_id || ""),
    rates,
  };
}

export async function buyLabel(params: { rate_id: string; label_format: string }) {
  const { rate_id, label_format } = params;
  const response = await shippoFetch<any>("transactions", {
    rate: rate_id,
    label_file_type: label_format,
    async: false,
  });

  if (response?.status !== "SUCCESS") {
    const message = response?.messages?.[0]?.text || "Shippo transaction failed";
    throw new Error(message);
  }

  const amount = Number(response?.rate?.amount);

  return {
    label_url: String(response?.label_url || ""),
    tracking_number: String(response?.tracking_number || ""),
    tracking_url: response?.tracking_url_provider ? String(response.tracking_url_provider) : null,
    postage_amount: Number.isFinite(amount) ? amount : null,
  } satisfies ShippoPurchase;
}
