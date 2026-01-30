"use client";

import { useMemo } from "react";

import {
  LegalCallout,
  LegalLayout,
  LegalList,
  LegalSection,
} from "@/components/legal/LegalLayout";
import { useT } from "@/components/providers/LanguageProvider";
import { LEGAL_LAST_UPDATED, legalConfig } from "@/config/legal";

type Section = {
  id: string;
  title: string;
  eyebrow?: string;
  body?: string[];
  bullets?: string[];
};

export default function TermsContent() {
  const t = useT();
  const returnsWindow = legalConfig.returnsWindowDays ?? "XX";

  const sections: Section[] = useMemo(
    () => [
      {
        id: "overview",
        title: t("terms.sections.overview.title"),
        body: [t("terms.sections.overview.body1"), t("terms.sections.overview.body2")],
      },
      {
        id: "eligibility",
        title: t("terms.sections.eligibility.title"),
        body: [t("terms.sections.eligibility.body1"), t("terms.sections.eligibility.body2")],
      },
      {
        id: "orders",
        title: t("terms.sections.orders.title"),
        bullets: [
          t("terms.sections.orders.bullets.payment"),
          t("terms.sections.orders.bullets.pricing"),
          t("terms.sections.orders.bullets.auth"),
          t("terms.sections.orders.bullets.promos"),
          t("terms.sections.orders.bullets.confirmation"),
        ],
      },
      {
        id: "shipping",
        title: t("terms.sections.shipping.title"),
        body: [
          t("terms.sections.shipping.body1"),
          t("terms.sections.shipping.body2"),
          t("terms.sections.shipping.body3"),
        ],
      },
      {
        id: "returns",
        title: t("terms.sections.returns.title"),
        eyebrow: t("terms.sections.returns.eyebrow"),
        body: [
          t("terms.sections.returns.body1"),
          t("terms.sections.returns.body2", { returnsWindowDays: returnsWindow }),
          t("terms.sections.returns.body3", { returnsEmail: legalConfig.returnsEmail }),
        ],
      },
      {
        id: "product",
        title: t("terms.sections.product.title"),
        body: [t("terms.sections.product.body1"), t("terms.sections.product.body2")],
      },
      {
        id: "accounts",
        title: t("terms.sections.accounts.title"),
        body: [t("terms.sections.accounts.body1"), t("terms.sections.accounts.body2")],
      },
      {
        id: "ip",
        title: t("terms.sections.ip.title"),
        body: [t("terms.sections.ip.body1", { businessName: legalConfig.businessName })],
      },
      {
        id: "prohibited",
        title: t("terms.sections.prohibited.title"),
        bullets: [
          t("terms.sections.prohibited.bullets.unlawful"),
          t("terms.sections.prohibited.bullets.interfere"),
          t("terms.sections.prohibited.bullets.misuse"),
          t("terms.sections.prohibited.bullets.impersonation"),
        ],
      },
      {
        id: "disclaimers",
        title: t("terms.sections.disclaimers.title"),
        body: [
          t("terms.sections.disclaimers.body1"),
          t("terms.sections.disclaimers.body2"),
        ],
      },
      {
        id: "law",
        title: t("terms.sections.law.title"),
        body: [t("terms.sections.law.body1", { governingLaw: legalConfig.governingLaw })],
      },
      {
        id: "updates",
        title: t("terms.sections.updates.title"),
        body: [t("terms.sections.updates.body1")],
      },
      {
        id: "contact",
        title: t("terms.sections.contact.title"),
        body: [t("terms.sections.contact.body1", { supportEmail: legalConfig.supportEmail })],
      },
    ],
    [t, returnsWindow]
  );

  const tocItems = useMemo(
    () => sections.map((section) => ({ id: section.id, label: section.title })),
    [sections]
  );

  const lastUpdated = t("legal.lastUpdated", { date: LEGAL_LAST_UPDATED });
  const disclaimer =
    t("legal.disclaimer") + " " + t("legal.contact", { email: legalConfig.supportEmail });

  return (
    <LegalLayout
      title={t("terms.title")}
      description={t("terms.description")}
      lastUpdated={lastUpdated}
      tocLabel={t("legal.toc")}
      tocItems={tocItems}
      disclaimer={disclaimer}
    >
      {sections.map((section) => (
        <LegalSection key={section.id} id={section.id} title={section.title} eyebrow={section.eyebrow}>
          {section.body?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets ? <LegalList items={section.bullets} /> : null}
          {section.id === "returns" ? (
            <LegalCallout
              tone="warning"
              title={t("legal.policyTbd")}
              body={t("legal.todo")}
            />
          ) : null}
        </LegalSection>
      ))}
    </LegalLayout>
  );
}
