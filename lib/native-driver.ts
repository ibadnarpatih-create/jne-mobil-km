type NativeBridge = { postMessage: (message: string) => void; onmessage?: (event: { data: string }) => void };
declare global { interface Window { MovetraNative?: NativeBridge } }
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
export function isNativeDriver() { return typeof window !== "undefined" && !!window.MovetraNative; }
export function nativeDriver(command: string, data: Record<string, unknown> = {}): Promise<unknown> {
  if (!isNativeDriver()) return Promise.resolve(null);
  const bridge = window.MovetraNative!;
  bridge.onmessage = event => {
    const result = JSON.parse(event.data);
    const request = pending.get(result.id);
    if (!request) return;
    pending.delete(result.id);
    if (result.error) request.reject(new Error(result.error)); else request.resolve(result.value);
  };
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { pending.delete(id); reject(new Error("APK tidak merespons. Buka ulang aplikasi lalu coba lagi.")); }, 90000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    bridge.postMessage(JSON.stringify({ id, command, ...data }));
  });
}
