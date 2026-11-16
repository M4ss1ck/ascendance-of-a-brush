/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
/**
 * PROTOTYPE (issue #6): three UI directions for the painter, switchable via ?variant=A|B|C on
 * the app's only route. Throwaway; lives on branch prototype/app-ui-6, never on main.
 */
import { Session } from "./session.ts";
import { mountSwitcher } from "./switcher.ts";
import { mountEasel } from "./variant-a-easel.ts";
import { mountRecipe } from "./variant-b-recipe.ts";
import { mountPalette } from "./variant-c-palette.ts";
import { mountScriptorium } from "./variant-d-scriptorium.ts";

const VARIANTS = [
  {
    key: "D",
    name: "Scriptorium",
    mount: mountScriptorium,
    fonts:
      "family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Alegreya+Sans:wght@400;500",
  },
  {
    key: "A",
    name: "Easel",
    mount: mountEasel,
    fonts:
      "family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Mono:wght@400;600",
  },
  {
    key: "B",
    name: "Recipe",
    mount: mountRecipe,
    fonts:
      "family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=IBM+Plex+Mono:wght@400;600",
  },
  {
    key: "C",
    name: "Palette",
    mount: mountPalette,
    fonts: "family=Archivo:wdth,wght@62..125,500;62..125,700;62..125,800",
  },
];

export function mountPrototype(root: HTMLElement): void {
  const key = new URLSearchParams(location.search).get("variant") ?? "D";
  const v = VARIANTS.find((x) => x.key === key) ?? VARIANTS[0]!;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${v.fonts}&display=swap`;
  document.head.append(link);
  document.body.className = "";
  const session = new Session();
  v.mount(root, session);
  mountSwitcher(VARIANTS, v.key, session);
}
