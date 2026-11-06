export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startOfficeScheduler } = await import("@/lib/server/office-scheduler");
  startOfficeScheduler();
}
