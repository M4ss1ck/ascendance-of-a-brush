import "./style.css";
import { tw } from "./ui/tw.ts";

// App shell placeholder. The painter UI lands with the engine port (see the GitHub issues).
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app root missing from index.html");

const main = document.createElement("main");
main.className = tw`mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-3 px-4`;

const title = document.createElement("h1");
title.className = tw`text-3xl font-bold tracking-tight`;
title.textContent = "Ascendance of a Brush";

const blurb = document.createElement("p");
blurb.className = tw`text-stone-600 dark:text-stone-400`;
blurb.textContent =
  "A deterministic painter that runs entirely in your browser. The brush engine is being ported.";

main.append(title, blurb);
app.append(main);
