import "server-only";

import sql from "@/lib/db";

type EmailEventType = "order_confirmation" | "shipping_confirmation";

type OrderEmailRow = {
  id: string;
  email: string | null;
  customer_name: string | null;
  contact: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  delivery_option: string | null;
  promo_code: string | null;
  subtotal_cents: number | null;
  discount_cents: number | null;
  currency: string | null;
  created_at: string;
};

type OrderItemRow = {
  name: string;
  quantity: number;
  price_cents: number;
  size: string | null;
  variant: string | null;
};

type ShipmentRow = {
  tracking_number: string | null;
  tracking_url: string | null;
  provider?: string | null;
};

type OrderEmailData = {
  order: OrderEmailRow;
  items: OrderItemRow[];
  shipment: ShipmentRow | null;
};

type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

type EmailLocale = "en" | "es";

const EMAIL_PROVIDER = "resend";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const COLORS = {
  bg: "#0b0b0c",
  panel: "#121214",
  border: "#242428",
  text: "#f5f5f5",
  muted: "#a3a3a3",
  accent: "#4ade80",
  accentText: "#0b0b0c",
};

const STRINGS = {
  en: {
    brand: "Lucky Caps",
    thanksHeading: "Thanks for your order",
    shippedHeading: "Your order is on the way",
    orderConfirmedIntro: "We received your payment and are preparing your Lucky Caps order.",
    shippedIntro: "We have shipped your Lucky Caps order.",
    orderDetails: "Order details",
    orderNumber: "Order number",
    orderDate: "Order date",
    customerEmail: "Customer email",
    orderSummary: "Order summary",
    shippingAddress: "Shipping address",
    item: "Item",
    qty: "Qty",
    unit: "Unit",
    lineTotal: "Total",
    subtotal: "Subtotal",
    shipping: "Shipping",
    tax: "Tax",
    discount: "Discount",
    total: (currency: string) => `Total (${currency})`,
    free: "Free",
    noItems: "No items found for this order.",
    noAddress: "No shipping address on file.",
    trackingDetails: "Tracking details",
    trackingNumber: "Tracking number",
    carrier: "Carrier",
    carrierPending: "TBD",
    trackingLink: "Tracking link",
    trackingPending: "Tracking details will be available soon.",
    viewOrder: "View your order",
    trackPackage: "Track your package",
    supportLine: "Questions? Reply to this email.",
    orderConfirmedSubject: (shortId: string) => `Order confirmed - #${shortId}`,
    shippedSubject: (shortId: string) => `Shipped - Order #${shortId}`,
  },
  es: {
    brand: "Lucky Caps",
    thanksHeading: "Gracias por tu pedido",
    shippedHeading: "Tu pedido va en camino",
    orderConfirmedIntro: "Recibimos tu pago y preparamos tu pedido Lucky Caps.",
    shippedIntro: "Tu pedido Lucky Caps ya fue enviado.",
    orderDetails: "Detalles del pedido",
    orderNumber: "Numero de pedido",
    orderDate: "Fecha del pedido",
    customerEmail: "Correo",
    orderSummary: "Resumen del pedido",
    shippingAddress: "Direccion de envio",
    item: "Articulo",
    qty: "Cant.",
    unit: "Unidad",
    lineTotal: "Total",
    subtotal: "Subtotal",
    shipping: "Envio",
    tax: "Impuesto",
    discount: "Descuento",
    total: (currency: string) => `Total (${currency})`,
    free: "Gratis",
    noItems: "No se encontraron articulos para este pedido.",
    noAddress: "No hay direccion de envio registrada.",
    trackingDetails: "Detalles de envio",
    trackingNumber: "Numero de seguimiento",
    carrier: "Transportista",
    carrierPending: "Pendiente",
    trackingLink: "Link de seguimiento",
    trackingPending: "Los detalles de seguimiento estaran disponibles pronto.",
    viewOrder: "Ver tu pedido",
    trackPackage: "Rastrear paquete",
    supportLine: "Preguntas? Responde a este correo.",
    orderConfirmedSubject: (shortId: string) => `Pedido confirmado - #${shortId}`,
    shippedSubject: (shortId: string) => `Enviado - Pedido #${shortId}`,
  },
} satisfies Record<EmailLocale, Record<string, unknown>>;

type EmailStrings = typeof STRINGS.en;

const getStrings = (locale: EmailLocale): EmailStrings => STRINGS[locale] as EmailStrings;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const resolveLocale = (locale?: string | null): EmailLocale => {
  const normalized = locale?.toLowerCase() ?? "";
  return normalized.startsWith("es") ? "es" : "en";
};

const safeString = (value: unknown, fallback = "") =>
  value == null ? fallback : String(value);

const shortOrderId = (orderId: string) => orderId.replace(/-/g, "").slice(-6).toUpperCase();

const formatDate = (value: string | null | undefined, locale: EmailLocale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const localeCode = locale === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(localeCode, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const titleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const resolveCarrierLabel = (provider?: string | null, trackingUrl?: string | null) => {
  if (provider) return titleCase(provider);
  const url = (trackingUrl || "").toLowerCase();
  if (url.includes("usps")) return "USPS";
  if (url.includes("ups")) return "UPS";
  if (url.includes("fedex")) return "FedEx";
  if (url.includes("dhl")) return "DHL";
  return "";
};

const formatMoney = (cents: number, currency: string | null) => {
  const amount = Number.isFinite(cents) ? cents / 100 : 0;
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

const formatOrderItemsHtml = (
  items: OrderItemRow[],
  currency: string | null,
  strings: EmailStrings
) => {
  if (!items.length) {
    return `<p style="margin: 0; color: ${COLORS.muted};">${escapeHtml(strings.noItems)}</p>`;
  }

  const rows = items
    .map((item) => {
      const detailParts = [item.variant, item.size].filter(Boolean);
      const detail = detailParts.length ? ` (${escapeHtml(detailParts.join(" / "))})` : "";
      const unitTotal = formatMoney(item.price_cents, currency);
      const lineTotal = formatMoney(item.price_cents * item.quantity, currency);
      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid ${COLORS.border};">
            ${escapeHtml(item.name)}${detail}
          </td>
          <td style="padding: 10px 0; text-align: center; border-bottom: 1px solid ${COLORS.border};">
            ${item.quantity}
          </td>
          <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid ${COLORS.border};">
            ${unitTotal}
          </td>
          <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid ${COLORS.border};">
            ${lineTotal}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 10px 0; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.muted}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">
            ${escapeHtml(strings.item)}
          </th>
          <th style="text-align: center; padding: 10px 0; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.muted}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">
            ${escapeHtml(strings.qty)}
          </th>
          <th style="text-align: right; padding: 10px 0; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.muted}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">
            ${escapeHtml(strings.unit)}
          </th>
          <th style="text-align: right; padding: 10px 0; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.muted}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">
            ${escapeHtml(strings.lineTotal)}
          </th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

const formatOrderItemsText = (
  items: OrderItemRow[],
  currency: string | null,
  strings: EmailStrings
) => {
  if (!items.length) {
    return strings.noItems;
  }

  return items
    .map((item) => {
      const detailParts = [item.variant, item.size].filter(Boolean);
      const detail = detailParts.length ? ` (${detailParts.join(" / ")})` : "";
      const unitTotal = formatMoney(item.price_cents, currency);
      const lineTotal = formatMoney(item.price_cents * item.quantity, currency);
      return `- ${item.name}${detail} x${item.quantity} @ ${unitTotal} = ${lineTotal}`;
    })
    .join("\n");
};

const formatAddressHtml = (address: Record<string, unknown> | null, strings: EmailStrings) => {
  if (!address) return strings.noAddress;
  const data = address as {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
  const lines = [
    name || null,
    data.address1 || null,
    data.address2 || null,
    data.city || data.state || data.zip
      ? [data.city, data.state, data.zip].filter(Boolean).join(", ").trim()
      : null,
    data.country || null,
  ].filter(Boolean);

  if (!lines.length) return strings.noAddress;

  return lines.map((line) => escapeHtml(String(line))).join("<br />");
};

const formatAddressText = (address: Record<string, unknown> | null, strings: EmailStrings) => {
  if (!address) return strings.noAddress;
  const data = address as {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
  const lines = [
    name || null,
    data.address1 || null,
    data.address2 || null,
    data.city || data.state || data.zip
      ? [data.city, data.state, data.zip].filter(Boolean).join(", ").trim()
      : null,
    data.country || null,
  ].filter(Boolean);

  if (!lines.length) return strings.noAddress;

  return lines.join("\n");
};

const computeOrderTotals = (order: OrderEmailRow) => {
  const currencyCode = (order.currency || "usd").toUpperCase();
  const subtotalCents = Number.isFinite(order.subtotal_cents) ? order.subtotal_cents ?? 0 : 0;
  const discountCents = Number.isFinite(order.discount_cents) ? order.discount_cents ?? 0 : 0;
  const shippingCents = order.delivery_option === "express" ? 1200 : 0;
  const taxCents = 0;
  const totalCents = Math.max(0, subtotalCents + shippingCents + taxCents - discountCents);
  return {
    currencyCode,
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
  };
};

const buildSectionTitleHtml = (title: string) => `
  <h2 style="margin: 24px 0 12px; font-size: 16px; font-weight: 600; color: ${COLORS.text};">
    ${escapeHtml(title)}
  </h2>
`;

const buildOrderSummaryHtml = (
  order: OrderEmailRow,
  items: OrderItemRow[],
  strings: EmailStrings
) => {
  const { currencyCode, subtotalCents, discountCents, shippingCents, taxCents, totalCents } =
    computeOrderTotals(order);
  const itemTable = formatOrderItemsHtml(items, currencyCode, strings);
  const discountLabel = order.promo_code
    ? `${strings.discount} (${escapeHtml(order.promo_code)})`
    : strings.discount;

  const rows: string[] = [
    `
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted};">${escapeHtml(strings.subtotal)}</td>
        <td style="padding: 8px 0; text-align: right;">${formatMoney(
          subtotalCents,
          currencyCode
        )}</td>
      </tr>
    `,
    `
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted};">${escapeHtml(strings.shipping)}</td>
        <td style="padding: 8px 0; text-align: right;">${
          shippingCents > 0 ? formatMoney(shippingCents, currencyCode) : escapeHtml(strings.free)
        }</td>
      </tr>
    `,
  ];

  if (taxCents > 0) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted};">${escapeHtml(strings.tax)}</td>
        <td style="padding: 8px 0; text-align: right;">${formatMoney(
          taxCents,
          currencyCode
        )}</td>
      </tr>
    `);
  }

  if (discountCents > 0) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted};">${discountLabel}</td>
        <td style="padding: 8px 0; text-align: right;">-${formatMoney(
          discountCents,
          currencyCode
        )}</td>
      </tr>
    `);
  }

  rows.push(`
    <tr>
      <td style="padding: 10px 0; font-weight: 600;">${escapeHtml(
        strings.total(currencyCode)
      )}</td>
      <td style="padding: 10px 0; text-align: right; font-weight: 600;">${formatMoney(
        totalCents,
        currencyCode
      )}</td>
    </tr>
  `);

  return `
    ${itemTable}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 12px; border-collapse: collapse;">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
};

const buildOrderSummaryText = (
  order: OrderEmailRow,
  items: OrderItemRow[],
  strings: EmailStrings
) => {
  const { currencyCode, subtotalCents, discountCents, shippingCents, taxCents, totalCents } =
    computeOrderTotals(order);
  const discountLabel = order.promo_code
    ? `${strings.discount} (${order.promo_code})`
    : strings.discount;

  const totals = [
    `${strings.subtotal}: ${formatMoney(subtotalCents, currencyCode)}`,
    `${strings.shipping}: ${
      shippingCents > 0 ? formatMoney(shippingCents, currencyCode) : strings.free
    }`,
  ];

  if (taxCents > 0) {
    totals.push(`${strings.tax}: ${formatMoney(taxCents, currencyCode)}`);
  }

  if (discountCents > 0) {
    totals.push(`${discountLabel}: -${formatMoney(discountCents, currencyCode)}`);
  }

  totals.push(`${strings.total(currencyCode)}: ${formatMoney(totalCents, currencyCode)}`);

  return `${formatOrderItemsText(items, currencyCode, strings)}\n\n${totals.join("\n")}`;
};

const buildMetaTableHtml = (params: {
  strings: EmailStrings;
  shortId: string;
  orderDate: string;
  toEmail: string;
}) => {
  const rows = [
    { label: params.strings.orderNumber, value: `#${params.shortId}` },
    { label: params.strings.orderDate, value: params.orderDate || "-" },
    { label: params.strings.customerEmail, value: params.toEmail },
  ];

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border: 1px solid ${COLORS.border}; border-radius: 12px;">
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td style="padding: 10px 14px; color: ${COLORS.muted}; font-size: 12px;">
                  ${escapeHtml(row.label)}
                </td>
                <td style="padding: 10px 14px; text-align: right; font-size: 12px; color: ${COLORS.text};">
                  ${escapeHtml(row.value)}
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
};

const buildTrackingHtml = (shipment: ShipmentRow | null, strings: EmailStrings) => {
  const trackingNumber = safeString(shipment?.tracking_number).trim();
  const trackingUrl = safeString(shipment?.tracking_url).trim();
  const carrier = resolveCarrierLabel(shipment?.provider || null, trackingUrl);
  const carrierValue = carrier || (trackingNumber || trackingUrl ? strings.carrierPending : "");

  if (!trackingNumber && !trackingUrl) {
    return `<p style="margin: 0; color: ${COLORS.muted};">${escapeHtml(strings.trackingPending)}</p>`;
  }

  const rows: string[] = [];
  if (trackingNumber) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted};">${escapeHtml(
          strings.trackingNumber
        )}</td>
        <td style="padding: 8px 0; text-align: right;">${escapeHtml(trackingNumber)}</td>
      </tr>
    `);
  }
  if (carrierValue) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted};">${escapeHtml(strings.carrier)}</td>
        <td style="padding: 8px 0; text-align: right;">${escapeHtml(carrierValue)}</td>
      </tr>
    `);
  }
  if (trackingUrl) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted};">${escapeHtml(
          strings.trackingLink
        )}</td>
        <td style="padding: 8px 0; text-align: right;">
          <a href="${escapeHtml(trackingUrl)}" style="color: ${COLORS.accent}; text-decoration: none;">${escapeHtml(
            trackingUrl
          )}</a>
        </td>
      </tr>
    `);
  }

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border: 1px solid ${COLORS.border}; border-radius: 12px;">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
};

const buildTrackingText = (shipment: ShipmentRow | null, strings: EmailStrings) => {
  const trackingNumber = safeString(shipment?.tracking_number).trim();
  const trackingUrl = safeString(shipment?.tracking_url).trim();
  const carrier = resolveCarrierLabel(shipment?.provider || null, trackingUrl);
  const carrierValue = carrier || (trackingNumber || trackingUrl ? strings.carrierPending : "");

  if (!trackingNumber && !trackingUrl) {
    return strings.trackingPending;
  }

  const lines: string[] = [];
  if (trackingNumber) lines.push(`${strings.trackingNumber}: ${trackingNumber}`);
  if (carrierValue) lines.push(`${strings.carrier}: ${carrierValue}`);
  if (trackingUrl) lines.push(`${strings.trackingLink}: ${trackingUrl}`);

  return lines.join("\n");
};

const buildButtonHtml = (label: string, url: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="border-radius: 999px; background-color: ${COLORS.accent};">
        <a href="${escapeHtml(url)}" style="display: inline-block; padding: 12px 24px; color: ${COLORS.accentText}; font-size: 14px; font-weight: 600; text-decoration: none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>
`;

const buildEmailLayout = (params: {
  strings: EmailStrings;
  heading: string;
  intro: string;
  preheader: string;
  metaHtml?: string;
  bodyHtml: string;
  buttonLabel?: string;
  buttonUrl?: string;
}) => {
  const buttonHtml =
    params.buttonLabel && params.buttonUrl
      ? buildButtonHtml(params.buttonLabel, params.buttonUrl)
      : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(params.heading)}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${COLORS.bg};">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
          ${escapeHtml(params.preheader)}
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${COLORS.bg}; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width: 100%; max-width: 600px; background-color: ${COLORS.panel}; border: 1px solid ${COLORS.border}; border-radius: 16px;">
                <tr>
                  <td style="padding: 24px 28px 12px; font-family: Arial, Helvetica, sans-serif; color: ${COLORS.text};">
                    <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: ${COLORS.accent};">
                      ${escapeHtml(params.strings.brand)}
                    </div>
                    <div style="margin: 12px 0 6px; font-size: 22px; font-weight: 600;">
                      ${escapeHtml(params.heading)}
                    </div>
                    <div style="font-size: 14px; color: ${COLORS.muted};">
                      ${escapeHtml(params.intro)}
                    </div>
                  </td>
                </tr>
                ${params.metaHtml ? `<tr><td style="padding: 0 28px 12px;">${params.metaHtml}</td></tr>` : ""}
                <tr>
                  <td style="padding: 0 28px 8px; font-family: Arial, Helvetica, sans-serif; color: ${COLORS.text}; font-size: 14px;">
                    ${params.bodyHtml}
                  </td>
                </tr>
                ${buttonHtml ? `<tr><td style="padding: 8px 28px 20px;">${buttonHtml}</td></tr>` : ""}
                <tr>
                  <td style="padding: 0 28px 24px; font-family: Arial, Helvetica, sans-serif; color: ${COLORS.muted}; font-size: 12px;">
                    ${escapeHtml(params.strings.supportLine)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildOrderConfirmationHtml = (params: {
  data: OrderEmailData;
  orderUrl: string;
  strings: EmailStrings;
  orderDate: string;
  shortId: string;
  toEmail: string;
}) => {
  const summaryHtml = buildOrderSummaryHtml(params.data.order, params.data.items, params.strings);
  const addressHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border: 1px solid ${COLORS.border}; border-radius: 12px;">
      <tbody>
        <tr>
          <td style="padding: 12px 14px; color: ${COLORS.text};">
            ${formatAddressHtml(params.data.order.shipping_address, params.strings)}
          </td>
        </tr>
      </tbody>
    </table>
  `;
  const bodyHtml = `
    ${buildSectionTitleHtml(params.strings.orderSummary)}
    ${summaryHtml}
    ${buildSectionTitleHtml(params.strings.shippingAddress)}
    ${addressHtml}
  `;
  const { totalCents, currencyCode } = computeOrderTotals(params.data.order);
  const preheader = `${params.strings.orderConfirmedSubject(params.shortId)} - ${formatMoney(
    totalCents,
    currencyCode
  )}`;
  const metaHtml = `
    <div style="margin: 4px 0 8px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: ${COLORS.muted};">
      ${escapeHtml(params.strings.orderDetails)}
    </div>
    ${buildMetaTableHtml({
      strings: params.strings,
      shortId: params.shortId,
      orderDate: params.orderDate,
      toEmail: params.toEmail,
    })}
  `;

  return buildEmailLayout({
    strings: params.strings,
    heading: params.strings.thanksHeading,
    intro: params.strings.orderConfirmedIntro,
    preheader,
    metaHtml,
    bodyHtml,
    buttonLabel: params.strings.viewOrder,
    buttonUrl: params.orderUrl,
  });
};

const buildShippingConfirmationHtml = (params: {
  data: OrderEmailData;
  orderUrl: string;
  strings: EmailStrings;
  orderDate: string;
  shortId: string;
  toEmail: string;
}) => {
  const summaryHtml = buildOrderSummaryHtml(params.data.order, params.data.items, params.strings);
  const addressHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border: 1px solid ${COLORS.border}; border-radius: 12px;">
      <tbody>
        <tr>
          <td style="padding: 12px 14px; color: ${COLORS.text};">
            ${formatAddressHtml(params.data.order.shipping_address, params.strings)}
          </td>
        </tr>
      </tbody>
    </table>
  `;
  const trackingHtml = buildTrackingHtml(params.data.shipment, params.strings);
  const bodyHtml = `
    ${buildSectionTitleHtml(params.strings.trackingDetails)}
    ${trackingHtml}
    ${buildSectionTitleHtml(params.strings.orderSummary)}
    ${summaryHtml}
    ${buildSectionTitleHtml(params.strings.shippingAddress)}
    ${addressHtml}
  `;
  const { totalCents, currencyCode } = computeOrderTotals(params.data.order);
  const preheader = `${params.strings.shippedSubject(params.shortId)} - ${formatMoney(
    totalCents,
    currencyCode
  )}`;
  const metaHtml = `
    <div style="margin: 4px 0 8px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: ${COLORS.muted};">
      ${escapeHtml(params.strings.orderDetails)}
    </div>
    ${buildMetaTableHtml({
      strings: params.strings,
      shortId: params.shortId,
      orderDate: params.orderDate,
      toEmail: params.toEmail,
    })}
  `;

  const trackingUrl = safeString(params.data.shipment?.tracking_url).trim();
  const buttonLabel = trackingUrl ? params.strings.trackPackage : params.strings.viewOrder;
  const buttonUrl = trackingUrl || params.orderUrl;

  return buildEmailLayout({
    strings: params.strings,
    heading: params.strings.shippedHeading,
    intro: params.strings.shippedIntro,
    preheader,
    metaHtml,
    bodyHtml,
    buttonLabel,
    buttonUrl,
  });
};

const buildOrderConfirmationText = (params: {
  data: OrderEmailData;
  orderUrl: string;
  strings: EmailStrings;
  orderDate: string;
  shortId: string;
  toEmail: string;
}) => `
${params.strings.brand}
${params.strings.orderConfirmedSubject(params.shortId)}

${params.strings.orderDetails}
${params.strings.orderNumber}: #${params.shortId}
${params.strings.orderDate}: ${params.orderDate || "-"}
${params.strings.customerEmail}: ${params.toEmail}

${params.strings.orderSummary}
${buildOrderSummaryText(params.data.order, params.data.items, params.strings)}

${params.strings.shippingAddress}
${formatAddressText(params.data.order.shipping_address, params.strings)}

${params.strings.viewOrder}: ${params.orderUrl}

${params.strings.supportLine}
`.trim();

const buildShippingConfirmationText = (params: {
  data: OrderEmailData;
  orderUrl: string;
  strings: EmailStrings;
  orderDate: string;
  shortId: string;
  toEmail: string;
}) => `
${params.strings.brand}
${params.strings.shippedSubject(params.shortId)}

${params.strings.orderDetails}
${params.strings.orderNumber}: #${params.shortId}
${params.strings.orderDate}: ${params.orderDate || "-"}
${params.strings.customerEmail}: ${params.toEmail}

${params.strings.trackingDetails}
${buildTrackingText(params.data.shipment, params.strings)}

${params.strings.orderSummary}
${buildOrderSummaryText(params.data.order, params.data.items, params.strings)}

${params.strings.shippingAddress}
${formatAddressText(params.data.order.shipping_address, params.strings)}

${params.strings.viewOrder}: ${params.orderUrl}

${params.strings.supportLine}
`.trim();

const resolveEmailConfig = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  const siteUrl = process.env.SITE_URL?.trim();

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing EMAIL_FROM");
  if (!/</.test(from) || !/>/.test(from)) {
    throw new Error("EMAIL_FROM must use the format \"Name <email@domain.com>\"");
  }
  if (!replyTo) throw new Error("Missing EMAIL_REPLY_TO");
  if (!siteUrl) throw new Error("Missing SITE_URL");

  return { apiKey, from, replyTo, siteUrl };
};

const buildOrderUrl = (siteUrl: string, orderId: string) =>
  new URL(`/order/${orderId}`, siteUrl).toString();

const readOrderEmailData = async (orderId: string): Promise<OrderEmailData | null> => {
  const rows = (await sql`
    SELECT
      id,
      email,
      customer_name,
      contact,
      shipping_address,
      delivery_option,
      promo_code,
      subtotal_cents,
      COALESCE(discount_cents, 0)::int AS discount_cents,
      currency,
      created_at
    FROM public.orders
    WHERE id = ${orderId}::uuid
    LIMIT 1
  `) as OrderEmailRow[];

  const order = rows[0];
  if (!order) return null;

  order.contact = parseJson(order.contact, null);
  order.shipping_address = parseJson(order.shipping_address, null);

  const items = (await sql`
    SELECT name, quantity, price_cents, size, variant
    FROM public.order_items
    WHERE order_id = ${orderId}::uuid
  `) as OrderItemRow[];

  const shipmentRows = (await sql`
    SELECT tracking_number, tracking_url, provider
    FROM public.shipments
    WHERE order_id = ${orderId}::uuid
    LIMIT 1
  `) as ShipmentRow[];

  return { order, items, shipment: shipmentRows[0] ?? null };
};

const buildEmailContent = (params: {
  data: OrderEmailData;
  eventType: EmailEventType;
  locale: EmailLocale;
  siteUrl: string;
  toEmail: string;
}) => {
  const strings = getStrings(params.locale);
  const orderId = params.data.order.id;
  const shortIdValue = shortOrderId(orderId);
  const orderDate = formatDate(params.data.order.created_at, params.locale);
  const orderUrl = buildOrderUrl(params.siteUrl, orderId);

  if (params.eventType === "order_confirmation") {
    return {
      subject: strings.orderConfirmedSubject(shortIdValue),
      html: buildOrderConfirmationHtml({
        data: params.data,
        orderUrl,
        strings,
        orderDate,
        shortId: shortIdValue,
        toEmail: params.toEmail,
      }),
      text: buildOrderConfirmationText({
        data: params.data,
        orderUrl,
        strings,
        orderDate,
        shortId: shortIdValue,
        toEmail: params.toEmail,
      }),
    };
  }

  return {
    subject: strings.shippedSubject(shortIdValue),
    html: buildShippingConfirmationHtml({
      data: params.data,
      orderUrl,
      strings,
      orderDate,
      shortId: shortIdValue,
      toEmail: params.toEmail,
    }),
    text: buildShippingConfirmationText({
      data: params.data,
      orderUrl,
      strings,
      orderDate,
      shortId: shortIdValue,
      toEmail: params.toEmail,
    }),
  };
};

const insertEmailEvent = async (params: {
  orderId: string;
  eventType: EmailEventType;
  toEmail: string;
  locale?: string | null;
}) => {
  const rows = (await sql`
    INSERT INTO public.email_events (
      order_id,
      event_type,
      to_email,
      locale,
      provider,
      status
    )
    VALUES (
      ${params.orderId}::uuid,
      ${params.eventType},
      ${params.toEmail},
      ${params.locale ?? null},
      ${EMAIL_PROVIDER},
      'queued'
    )
    ON CONFLICT (order_id, event_type) DO NOTHING
    RETURNING id
  `) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
};

const markEmailSent = async (params: {
  eventId: string;
  orderId: string;
  providerMessageId: string | null;
  sentColumn: "order_confirmation_sent_at" | "shipping_confirmation_sent_at";
}) => {
  await sql`
    UPDATE public.email_events
    SET
      status = 'sent',
      provider_message_id = ${params.providerMessageId},
      sent_at = now()
    WHERE id = ${params.eventId}::uuid
  `;

  if (params.sentColumn === "order_confirmation_sent_at") {
    await sql`
      UPDATE public.orders
      SET
        order_confirmation_sent_at = COALESCE(order_confirmation_sent_at, now()),
        last_email_error = NULL,
        updated_at = now()
      WHERE id = ${params.orderId}::uuid
    `;
  } else {
    await sql`
      UPDATE public.orders
      SET
        shipping_confirmation_sent_at = COALESCE(shipping_confirmation_sent_at, now()),
        last_email_error = NULL,
        updated_at = now()
      WHERE id = ${params.orderId}::uuid
    `;
  }
};

const markEmailFailed = async (params: {
  eventId: string;
  orderId: string;
  error: string;
}) => {
  await sql`
    UPDATE public.email_events
    SET
      status = 'failed',
      error = ${params.error}
    WHERE id = ${params.eventId}::uuid
  `;

  await sql`
    UPDATE public.orders
    SET
      last_email_error = ${params.error},
      updated_at = now()
    WHERE id = ${params.orderId}::uuid
  `;
};

const sendResendEmail = async (params: {
  apiKey: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      reply_to: params.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  let data: { id?: string; message?: string; error?: string } | null = null;
  try {
    data = (await res.json()) as typeof data;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `Resend request failed (${res.status})`;
    throw new Error(message);
  }

  return { id: data?.id ? String(data.id) : null };
};

const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

const sendTransactionalEmail = async (params: {
  orderId: string;
  eventType: EmailEventType;
  locale?: string | null;
}): Promise<SendEmailResult> => {
  let eventId: string | null = null;
  try {
    const data = await readOrderEmailData(params.orderId);
    if (!data) {
      return { ok: false, error: "Order not found" };
    }

    const contact = parseJson<{ email?: string }>(data.order.contact, {});
    const toEmail = String(data.order.email || contact?.email || "").trim();
    if (!toEmail) {
      return { ok: false, error: "Order email missing" };
    }

    eventId = await insertEmailEvent({
      orderId: params.orderId,
      eventType: params.eventType,
      toEmail,
      locale: params.locale ?? null,
    });

    if (!eventId) {
      return { ok: true, skipped: true };
    }

    const locale = resolveLocale(params.locale);
    const config = resolveEmailConfig();
    const content = buildEmailContent({
      data,
      eventType: params.eventType,
      locale,
      siteUrl: config.siteUrl,
      toEmail,
    });

    const result = await sendResendEmail({
      apiKey: config.apiKey,
      from: config.from,
      replyTo: config.replyTo,
      to: toEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    const sentColumn =
      params.eventType === "order_confirmation"
        ? "order_confirmation_sent_at"
        : "shipping_confirmation_sent_at";
    await markEmailSent({
      eventId,
      orderId: params.orderId,
      providerMessageId: result.id,
      sentColumn,
    });

    return { ok: true };
  } catch (err) {
    const message = errorMessage(err);
    if (eventId) {
      try {
        await markEmailFailed({
          eventId,
          orderId: params.orderId,
          error: message,
        });
      } catch (updateErr) {
        console.error("Failed to update email failure", {
          event_type: params.eventType,
          order_id: params.orderId,
          error: errorMessage(updateErr),
        });
      }
    }
    console.error("Transactional email failed", {
      event_type: params.eventType,
      order_id: params.orderId,
      error: message,
    });
    return { ok: false, error: message };
  }
};

export async function sendOrderConfirmationEmail(params: {
  orderId: string;
  locale?: string | null;
}) {
  return sendTransactionalEmail({
    orderId: params.orderId,
    eventType: "order_confirmation",
    locale: params.locale ?? null,
  });
}

export async function sendShippingConfirmationEmail(params: {
  orderId: string;
  locale?: string | null;
}) {
  return sendTransactionalEmail({
    orderId: params.orderId,
    eventType: "shipping_confirmation",
    locale: params.locale ?? null,
  });
}

// Dev preview helper for /api/dev/email-preview?type=order_confirmation&orderId=... (no send, no logging).
export async function buildEmailPreview(params: {
  orderId: string;
  eventType: EmailEventType;
  locale?: string | null;
  siteUrl?: string | null;
}) {
  const data = await readOrderEmailData(params.orderId);
  if (!data) return null;

  const locale = resolveLocale(params.locale);
  const siteUrl =
    params.siteUrl?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.URL?.trim() ||
    "http://localhost:3000";
  const contact = parseJson<{ email?: string }>(data.order.contact, {});
  const toEmail = String(data.order.email || contact?.email || "customer@example.com").trim();

  return buildEmailContent({
    data,
    eventType: params.eventType,
    locale,
    siteUrl,
    toEmail,
  });
}
