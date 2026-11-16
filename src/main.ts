import "./style.css";
import { mountApp } from "./ui/app.ts";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("#app root missing from index.html");

mountApp(root);
