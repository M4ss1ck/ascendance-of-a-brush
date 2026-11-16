# Ascendance of a Brush

A deterministic painter that runs entirely in your browser. Upload an image, pick what to paint (the whole image, a shape or a pencil outline) and a brush (Dab or Curved), and it paints it stroke by stroke. The same image, settings and seed always give the same painting.

Status: bootstrapping. The brush engine is being ported from the approved prototype in [`docs/reference/brush-bench.html`](docs/reference/brush-bench.html). The plan is tracked in [GitHub Issues](https://github.com/M4ss1ck/ascendance-of-a-brush/issues).

## Develop

Requires Node 26 (current LTS) and pnpm 12.

```sh
pnpm install
pnpm exec playwright install chromium   # once, for the browser test lane
pnpm dev                                # http://localhost:5173
pnpm check                              # typecheck, lint, format, all tests, build (what CI runs)
```

## Deploy (Cloudflare Pages)

Connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create → Pages → Connect to Git) with:

| Setting                | Value                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Production branch      | `main`                                                                                       |
| Build command          | `pnpm build`                                                                                 |
| Build output directory | `dist`                                                                                       |
| Environment variable   | `PNPM_VERSION=12.2.1` (the build image defaults to pnpm 10; Node comes from `.node-version`) |

Every PR then gets a preview deploy. No secrets live in this repo.

## Docs

- [`GLOSSARY.md`](GLOSSARY.md): the project's vocabulary.
- [`docs/adr/`](docs/adr/): settled decisions and rejected approaches.

## License

[MIT](LICENSE)
