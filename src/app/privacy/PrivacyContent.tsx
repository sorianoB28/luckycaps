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
  intro?: string;
  body?: string[];
  bullets?: string[];
  callout?: { title: string; body: string; tone?: "default" | "warning" };
};

export default function PrivacyContent() {
  const t = useT();

  const sections: Section[] = useMemo(
    () => [
      {
        id: "overview",
        title: t("privacy.sections.overview.title"),
        body: [
          t("privacy.sections.overview.body1", { businessName: legalConfig.businessName }),
          t("privacy.sections.overview.body2"),
        ],
      },
      {
        id: "information",
        title: t("privacy.sections.infoWeCollect.title"),
        bullets: [
          t("privacy.sections.infoWeCollect.items.account"),
          t("privacy.sections.infoWeCollect.items.checkout"),
          t("privacy.sections.infoWeCollect.items.payment"),
          t("privacy.sections.infoWeCollect.items.device"),
          t("privacy.sections.infoWeCollect.items.media"),
        ],
      },
      {
        id: "use",
        title: t("privacy.sections.howWeUse.title"),
        bullets: [
          t("privacy.sections.howWeUse.bullets.fulfill"),
          t("privacy.sections.howWeUse.bullets.communicate", {
            replyToEmail: legalConfig.replyToEmail,
          }),
          t("privacy.sections.howWeUse.bullets.support", { supportEmail: legalConfig.supportEmail }),
          t("privacy.sections.howWeUse.bullets.auth"),
          t("privacy.sections.howWeUse.bullets.improve"),
          t("privacy.sections.howWeUse.bullets.marketing"),
        ],
      },
      {
        id: "marketing",
        title: t("privacy.sections.marketing.title"),
        body: [
          t("privacy.sections.marketing.body1"),
          t("privacy.sections.marketing.body2", { supportEmail: legalConfig.supportEmail }),
        ],
      },
      {
        id: "cookies",
        title: t("privacy.sections.cookies.title"),
        body: [
          t("privacy.sections.cookies.body1"),
          t("privacy.sections.cookies.body3"),
        ],
        callout: {
          tone: "warning",
          title: t("legal.todo"),
          body: t("privacy.sections.cookies.body2"),
        },
      },
      {
        id: "sharing",
        title: t("privacy.sections.sharing.title"),
        intro: t("privacy.sections.sharing.intro"),
        bullets: [
          t("privacy.sections.sharing.items.stripe"),
          t("privacy.sections.sharing.items.shippo"),
          t("privacy.sections.sharing.items.resend"),
          t("privacy.sections.sharing.items.database"),
          t("privacy.sections.sharing.items.cloudinary"),
          t("privacy.sections.sharing.items.hosting"),
        ],
        body: [t("privacy.sections.sharing.closing")],
      },
      {
        id: "retention",
        title: t("privacy.sections.retention.title"),
        body: [
          t("privacy.sections.retention.body1"),
          t("privacy.sections.retention.body2"),
        ],
      },
      {
        id: "security",
        title: t("privacy.sections.security.title"),
        body: [
          t("privacy.sections.security.body1"),
          t("privacy.sections.security.body2"),
        ],
      },
      {
        id: "children",
        title: t("privacy.sections.children.title"),
        body: [t("privacy.sections.children.body", { supportEmail: legalConfig.supportEmail })],
      },
      {
        id: "rights",
        title: t("privacy.sections.rights.title"),
        body: [
          t("privacy.sections.rights.body1", { supportEmail: legalConfig.supportEmail }),
          t("privacy.sections.rights.body2"),
        ],
      },
      {
        id: "updates",
        title: t("privacy.sections.updates.title"),
        body: [t("privacy.sections.updates.body")],
      },
      {
        id: "contact",
        title: t("privacy.sections.contact.title"),
        body: [t("privacy.sections.contact.body", { supportEmail: legalConfig.supportEmail })],
      },
    ],
    [t]
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
      title={t("privacy.title")}
      description={t("privacy.description")}
      lastUpdated={lastUpdated}
      tocLabel={t("legal.toc")}
      tocItems={tocItems}
      disclaimer={disclaimer}
    >
      {sections.map((section) => (
        <LegalSection key={section.id} id={section.id} title={section.title}>
          {section.intro ? <p>{section.intro}</p> : null}
          {section.bullets ? <LegalList items={section.bullets} /> : null}
          {section.body?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.callout ? (
            <LegalCallout
              tone={section.callout.tone}
              title={section.callout.title}
              body={section.callout.body}
            />
          ) : null}
        </LegalSection>
      ))}
    </LegalLayout>
  );
}
