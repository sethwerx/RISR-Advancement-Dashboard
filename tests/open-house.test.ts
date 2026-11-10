import { describe, expect, it } from "vitest";
import { normalizeWebhookUrl } from "@/lib/standalone/sync-webhook";
import { openHouseConfirmText, openHouseDuplicateBody, parseOpenHouseRecent, rememberOpenHouseRequest } from "@/lib/standalone/open-house";

describe("open house duplicate", () => {
  it("builds the webhook body and a dated confirmation", () => {
    expect(openHouseDuplicateBody({ division: "PreK", date: "2026-12-05", start: "", end: "  ", requestedAt: "2026-11-10T02:00:00.000Z" })).toEqual({
      division: "PreK",
      date: "2026-12-05",
      start: null,
      end: null,
      requested_at: "2026-11-10T02:00:00.000Z",
      source: "advancement-dashboard",
    });
    expect(openHouseDuplicateBody({ division: "ES", date: "2026-12-05", start: "09:00", end: "11:30", requestedAt: "2026-11-10T02:00:00.000Z" }).start).toBe("09:00");
    expect(openHouseConfirmText("Pre-K", "2026-12-05")).toBe("Duplicate Pre-K Open House to Saturday, December 5, 2026?");
    expect(normalizeWebhookUrl("http://example.com/hook")).toBeNull();
    const recent = rememberOpenHouseRequest([], { division: "MSHS", date: "2026-12-12", requestedAt: "2026-11-10T02:00:00.000Z" });
    expect(parseOpenHouseRecent(JSON.stringify(recent))[0].division).toBe("MSHS");
  });
});
