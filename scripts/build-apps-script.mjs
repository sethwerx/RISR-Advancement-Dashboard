import path from "node:path";
import { bundleDashboard, renderDashboardHtml, writeDashboardHtml } from "./dashboard-html.mjs";

const root = process.cwd();
const bundled = await bundleDashboard(root);
const browserHtml = renderDashboardHtml({ ...bundled, host: "browser" });
const appsHtml = renderDashboardHtml({ ...bundled, host: "apps-script" });
const browserPath = path.join(root, "dist", "advancement-office.html");
const appsPath = path.join(root, "apps-script", "Index.html");
writeDashboardHtml(browserPath, browserHtml);
writeDashboardHtml(appsPath, appsHtml);
const limit = 4_000_000;
if (appsHtml.length > limit) {
  throw new Error(`Apps Script Index.html is ${appsHtml.length} bytes. Keep it under ${limit} so HtmlService can serve it.`);
}
console.log(`Wrote ${browserPath} (${Math.round(browserHtml.length / 1024)} KB)`);
console.log(`Wrote ${appsPath} (${Math.round(appsHtml.length / 1024)} KB)`);
