import "server-only";

import sql from "@/lib/db";
import { areDevRoutesBlockedInCurrentRuntime } from "@/lib/devRoutes";
import { resolveDeploymentContext } from "@/lib/deploymentContext";
import { inspectStripeEnvironment } from "@/lib/stripeConfig";
import { inspectShippoEnvironment } from "@/lib/shipping/shippoConfig";
import { resolveAppOriginDiagnostics } from "@/lib/siteUrl";

export type DiagnosticLevel = "green" | "yellow" | "red";

export type DiagnosticRow = {
  label: string;
  level: DiagnosticLevel;
  value: string;
  detail?: string;
};

export type DiagnosticSection = {
  title: string;
  rows: DiagnosticRow[];
};

export type ReadinessDiagnostics = {
  generatedAt: string;
  sections: DiagnosticSection[];
};

type ColumnRow = {
  table_name: string;
  column_name: string;
};

type TableRow = {
  table_name: string;
};

type DatabaseInspection = {
  connected: boolean;
  missingTables: string[];
  missingColumns: string[];
  error?: string;
};

const DB_REQUIREMENTS: Record<string, string[]> = {
  checkout_sessions: [
    "stripe_checkout_session_id",
    "order_id",
    "contact",
    "shipping_address",
    "items",
    "subtotal_cents",
    "discount_cents",
    "shipping_cents",
    "tax_cents",
    "total_cents",
    "currency",
  ],
  stripe_webhook_events: ["event_id", "event_type", "stripe_checkout_session_id", "processed_at"],
  orders: [
    "stripe_checkout_session_id",
    "payment_status",
    "status",
    "email",
    "shipping_address",
    "subtotal_cents",
    "discount_cents",
    "shipping_cents",
    "tax_cents",
    "total_cents",
    "currency",
    "order_confirmation_sent_at",
    "shipping_confirmation_sent_at",
    "last_email_error",
  ],
  order_items: ["order_id", "product_id", "quantity", "price_cents"],
  shipments: [
    "order_id",
    "status",
    "provider_rate_id",
    "provider_shipment_id",
    "selected_rate",
    "label_url",
    "tracking_number",
    "tracking_url",
    "postage_amount",
    "postage_currency",
    "shippo_transaction_id",
    "label_purchased_at",
    "parcel_template_id",
  ],
  email_events: ["order_id", "event_type", "status", "provider_message_id", "error", "sent_at"],
};

function formatPresence(exists: boolean) {
  return exists ? "Configured" : "Missing";
}

function formatMode(mode: string | null) {
  return mode ? mode : "Unknown";
}

function toLevel(ok: boolean, warning = false): DiagnosticLevel {
  if (ok) return "green";
  return warning ? "yellow" : "red";
}

function summarizeList(values: string[], limit = 5) {
  if (values.length <= limit) return values.join(", ");
  const head = values.slice(0, limit).join(", ");
  return `${head}, +${values.length - limit} more`;
}

function inspectDevRouteGuards() {
  const blocked = areDevRoutesBlockedInCurrentRuntime();

  if (blocked) {
    return {
      level: "green" as const,
      value: "Blocked",
      detail:
        "Runtime /api/dev guard is active because NODE_ENV=production, so dev routes return 404 in deployed builds.",
    };
  }

  return {
    level: "yellow" as const,
    value: "Enabled outside production",
    detail: "Local development keeps /api/dev routes available for test and seed workflows.",
  };
}

async function inspectDatabaseSchema(): Promise<DatabaseInspection> {
  const tableNames = Object.keys(DB_REQUIREMENTS);

  try {
    const tableRows = (await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${tableNames}::text[])
    `) as unknown as TableRow[];
    const columnRows = (await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY(${tableNames}::text[])
    `) as unknown as ColumnRow[];

    const existingTables = new Set(tableRows.map((row) => row.table_name));
    const columnMap = new Map<string, Set<string>>();

    for (const row of columnRows) {
      const set = columnMap.get(row.table_name) ?? new Set<string>();
      set.add(row.column_name);
      columnMap.set(row.table_name, set);
    }

    const missingTables = tableNames.filter((tableName) => !existingTables.has(tableName));
    const missingColumns: string[] = [];

    for (const [tableName, columns] of Object.entries(DB_REQUIREMENTS)) {
      const existingColumns = columnMap.get(tableName) ?? new Set<string>();
      for (const column of columns) {
        if (!existingColumns.has(column)) {
          missingColumns.push(`${tableName}.${column}`);
        }
      }
    }

    return {
      connected: true,
      missingTables,
      missingColumns,
    } satisfies DatabaseInspection;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      connected: false,
      missingTables: [] as string[],
      missingColumns: [] as string[],
      error: message,
    } satisfies DatabaseInspection;
  }
}

export async function collectReadinessDiagnostics(): Promise<ReadinessDiagnostics> {
  const context = resolveDeploymentContext();
  const origin = resolveAppOriginDiagnostics();
  const stripe = inspectStripeEnvironment();
  const shippo = inspectShippoEnvironment();
  const devRouteGuards = inspectDevRouteGuards();
  const db = await inspectDatabaseSchema();

  const isProduction = context === "production";
  const originSafeForProduction = origin.isHttps && !origin.isLocalhost;

  return {
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "Deployment Runtime",
        rows: [
          {
            label: "NODE_ENV",
            level: process.env.NODE_ENV ? "green" : "yellow",
            value: process.env.NODE_ENV ?? "Unset",
          },
          {
            label: "Resolved app mode",
            level: "green",
            value: context,
            detail: `Resolved from CONTEXT/NETLIFY_DEV/NODE_ENV.`,
          },
          {
            label: "Resolved public origin",
            level: isProduction ? toLevel(originSafeForProduction) : "yellow",
            value: origin.resolvedOrigin,
            detail: `Source: ${origin.source}${origin.configuredOrigin ? ` (${origin.configuredOrigin})` : ""}`,
          },
        ],
      },
      {
        title: "Stripe Readiness",
        rows: [
          {
            label: "Resolved Stripe mode",
            level:
              stripe.issues.length === 0 && stripe.resolvedMode === stripe.expectedMode
                ? "green"
                : "red",
            value: `${formatMode(stripe.resolvedMode)} (expected ${stripe.expectedMode})`,
            detail: stripe.issues[0],
          },
          {
            label: "STRIPE_SECRET_KEY",
            level: toLevel(stripe.secretKeyPresent),
            value: formatPresence(stripe.secretKeyPresent),
            detail: stripe.secretKeyMode ? `Mode: ${stripe.secretKeyMode}` : undefined,
          },
          {
            label: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
            level: toLevel(stripe.publishableKeyPresent),
            value: formatPresence(stripe.publishableKeyPresent),
            detail: stripe.publishableKeyMode ? `Mode: ${stripe.publishableKeyMode}` : undefined,
          },
          {
            label: "STRIPE_WEBHOOK_SECRET",
            level: toLevel(stripe.webhookSecretPresent),
            value: formatPresence(stripe.webhookSecretPresent),
          },
          {
            label: "Stripe key modes match",
            level:
              stripe.keyModesMatch == null
                ? "yellow"
                : stripe.keyModesMatch
                ? "green"
                : "red",
            value:
              stripe.keyModesMatch == null
                ? "Cannot verify"
                : stripe.keyModesMatch
                ? "Match"
                : "Mismatch",
            detail:
              stripe.keyModesMatch == null
                ? "Both secret and publishable keys must be configured to verify mode alignment."
                : stripe.issues.find((issue) => issue.includes("publishable key")) ?? undefined,
          },
        ],
      },
      {
        title: "Shippo Readiness",
        rows: [
          {
            label: "Resolved Shippo mode",
            level:
              shippo.issues.length === 0 && shippo.resolvedMode === shippo.expectedMode
                ? "green"
                : "red",
            value: `${formatMode(shippo.resolvedMode)} (expected ${shippo.expectedMode})`,
            detail: shippo.issues[0],
          },
          {
            label: "SHIPPO_API_TOKEN",
            level: shippo.liveTokenPresent ? "green" : "yellow",
            value: formatPresence(shippo.liveTokenPresent),
            detail: shippo.liveTokenMode ? `Mode: ${shippo.liveTokenMode}` : undefined,
          },
          {
            label: "SHIPPO_TEST_TOKEN",
            level: shippo.testTokenPresent ? "green" : "yellow",
            value: formatPresence(shippo.testTokenPresent),
            detail: shippo.testTokenMode ? `Mode: ${shippo.testTokenMode}` : undefined,
          },
          {
            label: "Production uses live Shippo",
            level:
              !isProduction || shippo.productionUsesLiveToken
                ? isProduction
                  ? "green"
                  : "yellow"
                : "red",
            value:
              !isProduction
                ? "N/A outside production"
                : shippo.productionUsesLiveToken
                ? "Yes"
                : "No",
            detail: isProduction
              ? undefined
              : "Preview and local environments are expected to use SHIPPO_TEST_TOKEN.",
          },
        ],
      },
      {
        title: "Email Readiness",
        rows: [
          {
            label: "RESEND_API_KEY",
            level: toLevel(Boolean(process.env.RESEND_API_KEY?.trim())),
            value: formatPresence(Boolean(process.env.RESEND_API_KEY?.trim())),
          },
          {
            label: "EMAIL_FROM",
            level: toLevel(Boolean(process.env.EMAIL_FROM?.trim())),
            value: formatPresence(Boolean(process.env.EMAIL_FROM?.trim())),
          },
          {
            label: "EMAIL_REPLY_TO",
            level: toLevel(Boolean(process.env.EMAIL_REPLY_TO?.trim())),
            value: formatPresence(Boolean(process.env.EMAIL_REPLY_TO?.trim())),
          },
          {
            label: "HTTPS public origin in production",
            level: isProduction ? toLevel(originSafeForProduction) : "yellow",
            value:
              isProduction
                ? originSafeForProduction
                  ? "Valid"
                  : "Invalid"
                : "Checked only in production",
            detail:
              isProduction || originSafeForProduction
                ? undefined
                : "Production email and checkout links must resolve to a non-localhost HTTPS origin.",
          },
        ],
      },
      {
        title: "Safety Checks",
        rows: [
          {
            label: "/api/dev routes blocked in production",
            level: devRouteGuards.level,
            value: devRouteGuards.value,
            detail: devRouteGuards.detail,
          },
          {
            label: "Localhost origins rejected in production",
            level: isProduction ? toLevel(originSafeForProduction) : "yellow",
            value:
              isProduction
                ? originSafeForProduction
                  ? "Rejected"
                  : "Unsafe origin configured"
                : "Enforced only in production",
            detail:
              isProduction
                ? undefined
                : "Live Stripe checkout and production email origin validation reject localhost origins.",
          },
        ],
      },
      {
        title: "Database Checks",
        rows: [
          {
            label: "Database connection",
            level: db.connected ? "green" : "red",
            value: db.connected ? "Reachable" : "Unavailable",
            detail: db.connected ? undefined : db.error,
          },
          {
            label: "Critical tables",
            level: db.connected ? toLevel(db.missingTables.length === 0) : "red",
            value:
              db.connected && db.missingTables.length === 0
                ? "Present"
                : db.connected
                ? "Missing"
                : "Not checked",
            detail:
              db.connected && db.missingTables.length > 0
                ? summarizeList(db.missingTables)
                : "checkout_sessions, stripe_webhook_events, orders, order_items, shipments, email_events",
          },
          {
            label: "Critical columns",
            level: db.connected ? toLevel(db.missingColumns.length === 0) : "red",
            value:
              db.connected && db.missingColumns.length === 0
                ? "Present"
                : db.connected
                ? "Missing"
                : "Not checked",
            detail:
              db.connected && db.missingColumns.length > 0
                ? summarizeList(db.missingColumns)
                : "Order finalization, shipment persistence, and email tracking columns are present.",
          },
        ],
      },
    ],
  };
}
