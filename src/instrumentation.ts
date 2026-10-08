export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startCalendarPoller } = await import('@/lib/gcal/sync');
  startCalendarPoller();
}
