import "./style.css";
// PROTOTYPE branch (issue #6): the app route renders the UI variants. Never merge to main.
import { mountPrototype } from "./prototype-app-ui/mount.ts";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app root missing from index.html");
mountPrototype(app);
