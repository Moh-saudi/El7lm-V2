export async function register() {
  try {
    const g: any = globalThis as any;
    if (typeof g.self === 'undefined') g.self = g;
  } catch {}
}
