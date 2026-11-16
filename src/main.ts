import "./style.css";

// App shell placeholder. The painter UI lands with the engine port (see the GitHub issues).
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app root missing from index.html");

app.innerHTML = `
  <main class="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-3 px-4">
    <h1 class="text-3xl font-bold tracking-tight">Ascendance of a Brush</h1>
    <p class="text-stone-600 dark:text-stone-400">
      A deterministic painter that runs entirely in your browser. The brush engine is being ported.
    </p>
  </main>
`;
