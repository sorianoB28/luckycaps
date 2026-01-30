export const LEGAL_LAST_UPDATED = "January 30, 2026";

type NullableNumber = number | null;

export type LegalConfig = {
  businessName: string;
  supportEmail: string;
  replyToEmail: string;
  siteUrl: string;
  businessAddress: string;
  governingLaw: string;
  returnsWindowDays: NullableNumber;
  returnsEmail: string;
};

const fallback = {
  businessName: "Lucky Caps",
  supportEmail: "support@luckycapsshop.com",
  replyToEmail: "orders@luckycapsshop.com",
  siteUrl: "https://luckycapsshop.com",
  businessAddress: "TODO: Add business mailing address",
  governingLaw: "TODO: [STATE/COUNTRY]",
  returnsWindowDays: 30, // Suggested default; confirm or replace.
  returnsEmail: "support@luckycapsshop.com",
} satisfies LegalConfig;

const parsedReturns =
  process.env.RETURNS_WINDOW_DAYS && !Number.isNaN(Number(process.env.RETURNS_WINDOW_DAYS))
    ? Number(process.env.RETURNS_WINDOW_DAYS)
    : fallback.returnsWindowDays;

export const legalConfig: LegalConfig = {
  businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || fallback.businessName,
  supportEmail: process.env.EMAIL_REPLY_TO || fallback.supportEmail,
  replyToEmail:
    process.env.EMAIL_FROM || process.env.EMAIL_REPLY_TO || fallback.replyToEmail,
  siteUrl: process.env.SITE_URL || fallback.siteUrl,
  businessAddress: process.env.BUSINESS_ADDRESS || fallback.businessAddress,
  governingLaw: process.env.GOVERNING_LAW || fallback.governingLaw,
  returnsWindowDays: parsedReturns,
  returnsEmail: process.env.RETURNS_EMAIL || process.env.EMAIL_REPLY_TO || fallback.returnsEmail,
};
