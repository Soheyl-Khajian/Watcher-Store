// frontend/src/instrumentation.ts
//
// Runs once when the server starts. Stops it on settings that would make
// every request fail (lib/server/startup-check.ts).
//
// The import sits inside the NEXT_RUNTIME check, which Next.js resolves
// when it builds each runtime, so the Node-only check is left out of the
// edge build.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stopOnStartupProblems } =
      await import('./lib/server/startup-check');
    stopOnStartupProblems();
  }
}
