'use client';

import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Check, Copy, KeyRound, Loader2, Plug, Trash2 } from "lucide-react";
import { ActionButton, Card, Chip, IconButton } from "./ui/primitives";

interface TokenSummary {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

const subscribeToOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";
const inputClass = "w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-body text-white outline-none focus:border-accent-400/50 focus:ring-2 focus:ring-accent-400/15 disabled:opacity-50";

function displayDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Could not update connected apps. Try again.");
  return body;
}

function TokenControls() {
  const id = useId();
  const baseUrl = useSyncExternalStore(subscribeToOrigin, getOrigin, getServerOrigin);
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<{ token: string; name: string; id: string } | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tokens", { cache: "no-store", signal: controller.signal })
      .then(readResponse)
      .then((body) => setTokens(body.tokens))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load connected apps");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const body = await readResponse(await fetch("/api/tokens", { cache: "no-store" }));
      setTokens(body.tokens);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load connected apps");
    } finally {
      setLoading(false);
    }
  }

  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || created || !name.trim()) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const body = await readResponse(await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }),
      }));
      setCreated({ token: body.token, name: body.name, id: body.id });
      setTokens((tokens) => [{ id: body.id, name: body.name, prefix: body.prefix, scopes: body.scopes, createdAt: body.createdAt, lastUsedAt: null }, ...tokens]);
      setName("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create token");
    } finally {
      setBusy(false);
    }
  }

  async function revokeToken(token: TokenSummary) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await readResponse(await fetch(`/api/tokens/${encodeURIComponent(token.id)}`, { method: "DELETE" }));
      setTokens((tokens) => tokens.filter((item) => item.id !== token.id));
      if (created?.id === token.id) setCreated(null);
      setRevokeId(null);
      setMessage(`${token.name} revoked.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not revoke token");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, label: string) {
    setError(null);
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setError("Could not copy. Select the value and copy it manually.");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label htmlFor={`${id}-url`} className="mb-2 block text-caption font-bold text-neutral-300">API base URL</label>
        <div className="flex items-center gap-2">
          <input id={`${id}-url`} className={`${inputClass} font-mono text-caption`} value={baseUrl} readOnly onFocus={(event) => event.target.select()} />
          <IconButton aria-label="Copy API base URL" className="h-11 w-11" disabled={!baseUrl} onClick={() => copy(baseUrl, "URL")}><Copy size={16} aria-hidden /></IconButton>
        </div>
        <p className="mt-2 text-caption leading-relaxed text-neutral-500">Paste this URL and a token into Atlas Settings → Integrations → Recomp. Apps read your cloud-synced workouts and body weight.</p>
      </div>

      {created && (
        <Card className="space-y-3 border-accent-400/25 bg-accent-400/5 p-4">
          <p className="flex items-center gap-2 text-body font-bold text-accent-400"><Check size={16} className="shrink-0" aria-hidden /><span className="min-w-0 break-words">Token created for {created.name}</span></p>
          <label htmlFor={`${id}-secret`} className="block text-caption font-bold text-neutral-200">Copy your token — you won&apos;t see this again.</label>
          <textarea id={`${id}-secret`} readOnly rows={2} value={created.token} onFocus={(event) => event.target.select()} className={`${inputClass} resize-none break-all font-mono text-caption`} aria-describedby={`${id}-secret-hint`} />
          <p id={`${id}-secret-hint`} className="text-caption leading-relaxed text-neutral-400">Keep it private. Anyone with this token can read your workouts and body weight.</p>
          <div className="flex flex-wrap gap-2">
            <ActionButton tone="accent" className="w-auto flex-1 px-3 py-3" icon={<Copy size={14} aria-hidden />} onClick={() => copy(created.token, "Token")}>Copy token</ActionButton>
            <ActionButton className="w-auto px-3 py-3" onClick={() => { setCreated(null); setMessage(""); }}>Done</ActionButton>
          </div>
        </Card>
      )}

      <form onSubmit={createToken} className="space-y-2">
        <label htmlFor={`${id}-name`} className="block text-caption font-bold text-neutral-300">App name</label>
        <input id={`${id}-name`} className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Atlas" maxLength={60} required disabled={busy || loading || !!created || tokens.length >= 10} />
        <ActionButton type="submit" tone="accent" className="py-3 disabled:opacity-50" disabled={busy || loading || !!created || !name.trim() || tokens.length >= 10} icon={busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <KeyRound size={15} aria-hidden />}>Create token</ActionButton>
        <p className="text-mini text-neutral-500">{tokens.length}/10 active tokens · Read-only workout access{tokens.length >= 10 ? " · Revoke a token to create another." : ""}</p>
      </form>

      {loading ? <p role="status" className="text-caption text-neutral-400">Loading connected apps…</p> : tokens.length === 0 ? <p className="text-caption text-neutral-500">No connected apps yet.</p> : (
        <ul className="divide-y divide-white/6 border-t border-white/6">
          {tokens.map((token) => (
            <li key={token.id} className="py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-body font-bold text-white">{token.name}</p>
                  <p className="mt-1 font-mono text-caption text-neutral-400">rcp_{token.prefix}…</p>
                  <dl className="mt-2 space-y-1 text-mini text-neutral-500">
                    <div><dt className="inline font-semibold">Created: </dt><dd className="inline">{displayDate(token.createdAt)}</dd></div>
                    <div><dt className="inline font-semibold">Last used: </dt><dd className="inline">{displayDate(token.lastUsedAt)}</dd></div>
                  </dl>
                </div>
                <IconButton aria-label={`Revoke ${token.name}`} hover="danger" className="h-11 w-11" disabled={busy} onClick={() => setRevokeId(token.id)}><Trash2 size={16} aria-hidden /></IconButton>
              </div>
              {revokeId === token.id && (
                <div role="group" aria-labelledby={`${id}-revoke`} className="mt-3 space-y-3 rounded-xl border border-danger-400/20 bg-danger-400/5 p-3">
                  <p id={`${id}-revoke`} className="text-caption text-neutral-300">Revoke {token.name}? This app will lose access immediately.</p>
                  <div className="flex gap-2">
                    <ActionButton autoFocus className="py-3" disabled={busy} onClick={() => setRevokeId(null)}>Cancel</ActionButton>
                    <ActionButton tone="danger" className="py-3 disabled:opacity-50" disabled={busy} onClick={() => revokeToken(token)}>Revoke</ActionButton>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <div role="alert" className="space-y-2"><p className="text-caption text-danger-400">{error}</p><ActionButton className="py-3" disabled={loading || busy} onClick={reload}>Reload apps</ActionButton></div>}
      <p role="status" aria-live="polite" className="text-caption text-accent-400">{message}</p>
    </div>
  );
}

export default function ConnectedApps() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-400/10"><Plug size={17} className="text-accent-400" aria-hidden /></div>
        <div className="min-w-0 flex-1"><h2 className="text-body font-black text-white">Connected apps</h2><p className="mt-0.5 text-mini text-neutral-500">Your data, on your terms</p></div>
        {userId && <Chip tone="accent">Read only</Chip>}
      </div>
      {status === "loading" ? <p className="mt-3 text-caption text-neutral-500">Loading account…</p> : userId ? <TokenControls key={userId} /> : <p className="mt-3 text-caption leading-relaxed text-neutral-500">Sign in to create tokens and connect apps like Atlas.</p>}
    </Card>
  );
}
