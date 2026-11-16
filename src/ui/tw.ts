/**
 * Identity tag for Tailwind class strings in TypeScript. oxfmt only sorts
 * Tailwind classes in HTML `class` attributes and in calls to the functions
 * listed in `.oxfmtrc.json` (`sortTailwindcss.functions`), so DOM built from TS
 * wraps its class lists in tw`...` to keep them sorted.
 */
export const tw = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  String.raw({ raw: strings }, ...values);
