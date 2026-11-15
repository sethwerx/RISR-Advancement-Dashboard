import path from "node:path";
import { bundleDashboard, renderDashboardHtml, writeDashboardHtml } from "./dashboard-html.mjs";

const root = process.cwd();
const bundled = await bundleDashboard(root);
const html = renderDashboardHtml({ ...bundled, host: "browser" });
const htmlPath = path.join(root, "dist", "advancement-office.html");
writeDashboardHtml(htmlPath, html);
console.log(`Wrote ${htmlPath} (${Math.round(html.length / 1024)} KB)`);
