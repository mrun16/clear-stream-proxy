import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendChat } from "@/lib/proxy.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, Upload, X, Loader2, Send } from "lucide-react";

type Msg =
  | { role: "user"; text: string; fileName?: string }
  | { role: "assistant"; text: string }
  | { role: "system"; text: string; risk?: number; kind: "blocked" | "error" };

export function ChatPanel({ sessionId, onLogged }: { sessionId: string; onLogged: () => void }) {
  const send = useServerFn(sendChat);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (f: File) => {
    const isImage = f.type.startsWith("image/");
    if (isImage) {
      // Read as base64 data URL so the vision-capable worker LLM can actually see it.
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      setImageDataUrl(dataUrl);
      setFileContent("");
      setFileName(f.name);
      return;
    }
    const text = await f.text();
    setFileContent(text.slice(0, 20000));
    setImageDataUrl("");
    setFileName(f.name);
  };

  const submit = async () => {
    if (!input.trim() || busy) return;
    const userMsg: Msg = {
      role: "user",
      text: input,
      fileName: fileName || undefined,
    };
    setMessages((m) => [...m, userMsg]);
    const payload = {
      sessionId,
      message: input,
      fileContent,
      fileName,
      imageDataUrl,
    };
    setInput("");
    setFileContent("");
    setFileName("");
    setImageDataUrl("");
    setBusy(true);
    try {
      const res = await send({ data: payload });
      if (res.ok && res.reply) {
        setMessages((m) => [...m, { role: "assistant", text: res.reply! }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "system",
            text: res.reason || "Blocked.",
            risk: res.riskScore,
            kind: res.stage === "error" ? "error" : "blocked",
          },
        ]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: e instanceof Error ? e.message : "Request failed.",
          kind: "error",
        },
      ]);
    } finally {
      setBusy(false);
      onLogged();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-220px)] min-h-[420px]">
      <Card className="flex-1 overflow-y-auto p-4 space-y-3 bg-card/60">
        {messages.length === 0 && (
          <div className="text-muted-foreground text-sm text-center py-12">
            Send a message to test the proxy. Try a normal question, then try a prompt-injection
            attempt or ask the model to reveal its security token.
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Proxy inspecting & dispatching…
          </div>
        )}
      </Card>

      <Card className="p-3 space-y-2 bg-card/60">
        {fileName && (
          <div className="flex items-center justify-between gap-2 text-xs bg-muted rounded px-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt={fileName}
                  className="h-10 w-10 rounded object-cover border border-border"
                />
              ) : (
                <Upload className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">
                {fileName}
                {imageDataUrl
                  ? " — image will be sent to the vision model"
                  : ` (${fileContent.length} chars) — wrapped in `}
                {!imageDataUrl && <code className="text-primary">&lt;untrusted_data&gt;</code>}
              </span>
            </div>
            <button
              onClick={() => {
                setFileContent("");
                setFileName("");
                setImageDataUrl("");
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Remove file"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the proxied LLM anything…"
          className="min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.json,.csv,.log,.py,.js,.ts,.html,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" /> Attach file
          </Button>
          <Button onClick={submit} disabled={busy || !input.trim()} size="sm">
            <Send className="h-4 w-4 mr-1" /> Send
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-sm whitespace-pre-wrap">
          {msg.text}
          {msg.fileName && (
            <div className="mt-2 text-xs text-muted-foreground border-t border-primary/20 pt-1">
              📎 {msg.fileName}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (msg.role === "assistant") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    );
  }
  // system
  const isErr = msg.kind === "error";
  return (
    <div className="flex justify-center">
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm border ${
          isErr
            ? "bg-destructive/10 border-destructive/40 text-destructive-foreground"
            : "bg-destructive/15 border-destructive/50"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          {isErr ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {isErr ? "Proxy error" : "Request blocked"}
          {typeof msg.risk === "number" && (
            <Badge variant="outline" className="ml-1">
              risk {msg.risk}
            </Badge>
          )}
        </div>
        <div className="mt-1 text-xs opacity-90 whitespace-pre-wrap">{msg.text}</div>
      </div>
    </div>
  );
}
