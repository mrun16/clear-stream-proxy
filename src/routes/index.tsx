import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "@/components/ChatPanel";
import { SecurityLog } from "@/components/SecurityLog";
import { initSession } from "@/lib/proxy.functions";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Secure LLM Proxy — Chat & Security Log" },
      {
        name: "description",
        content:
          "Self-hosted proxy that normalizes input, segregates untrusted file data, runs intent risk scoring, injects canary tokens, and filters LLM output.",
      },
    ],
  }),
});

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr-placeholder-session";
  const KEY = "llm-proxy-session-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function Index() {
  const init = useServerFn(initSession);
  const [sessionId, setSessionId] = useState<string>("");
  const [logKey, setLogKey] = useState(0);

  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    init({ data: { sessionId: id } }).catch(() => {});
  }, [init]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Secure LLM Proxy</h1>
            <p className="text-xs text-muted-foreground">
              Normalization · Untrusted-data segregation · Intent vibe check · Canary tokens · Output
              filtering
            </p>
          </div>
          {sessionId && (
            <code className="text-[10px] text-muted-foreground hidden sm:block">
              session {sessionId.slice(0, 8)}…
            </code>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="log">Security Log</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-4">
            {sessionId ? (
              <ChatPanel sessionId={sessionId} onLogged={() => setLogKey((k) => k + 1)} />
            ) : (
              <div className="text-sm text-muted-foreground">Initializing session…</div>
            )}
          </TabsContent>
          <TabsContent value="log" className="mt-4">
            <SecurityLog refreshKey={logKey} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
