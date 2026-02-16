import type { Preview } from "@storybook/nextjs-vite";

import React from "react";

import "@/app/globals.css";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import type { Language } from "@/lib/i18n";
import { withFetchMock } from "./fetchMock";

type PreviewGlobals = {
  locale?: Language;
};

const preview: Preview = {
  initialGlobals: {
    locale: "EN",
  },
  globalTypes: {
    locale: {
      name: "Locale",
      description: "Global language for all stories",
      toolbar: {
        icon: "globe",
        dynamicTitle: true,
        items: [
          { value: "EN", title: "EN" },
          { value: "ES", title: "ES" },
        ],
      },
    },
  },
  decorators: [
    withFetchMock,
    (Story, context) =>
      React.createElement(
        LanguageProvider,
        {
          forcedLanguage: (context.globals as PreviewGlobals).locale ?? "EN",
        },
        React.createElement(
          "div",
          {
            className: "min-h-screen bg-lucky-darker p-6 text-white font-body",
            style: {
              "--font-display": "Bebas Neue, system-ui, sans-serif",
              "--font-body": "Inter, system-ui, sans-serif",
            } as React.CSSProperties,
          },
          React.createElement(Story)
        )
      ),
  ],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
