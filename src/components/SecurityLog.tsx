import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getLogs, clearLogs } from "@/lib/proxy.functions";
import type { LogEntry } from "@/lib/proxy-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";

export function SecurityLog({ refreshKey }: { refreshKey: number }) {
  const fetchLogs = useServerFn(getLogs);
  const wipeLogs = useServerFn(clearLogs);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLogs();
      setLogs(res.logs);
    } finally {
      setLoading(false);
    }
  }, [fetchLogs]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="font-semibold">Security Log</h3>
          <p className="text-xs text-muted-foreground">
            Every intercepted request, with risk score and verdict.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await wipeLogs();
              reload();
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No requests yet. Send a chat to populate the log.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Time</th>
                <th className="text-left px-4 py-2">Preview</th>
                <th className="text-left px-4 py-2">File</th>
                <th className="text-left px-4 py-2">Risk</th>
                <th className="text-left px-4 py-2">Stage</th>
                <th className="text-left px-4 py-2">Verdict</th>
                <th className="text-left px-4 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border/60 align-top">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(l.ts).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2 max-w-[260px]">
                    <div className="truncate" title={l.preview}>
                      {l.preview || <em className="text-muted-foreground">(empty)</em>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {l.hadFile ? <Badge variant="outline">file</Badge> : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <RiskPill score={l.riskScore} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <Badge variant="secondary">{l.stage}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {l.verdict === "allowed" ? (
                      <span className="inline-flex items-center gap-1 text-[color:var(--color-success)]">
                        <ShieldCheck className="h-3 w-3" /> Allowed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <ShieldAlert className="h-3 w-3" /> Blocked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-[320px]">
                    <div className="text-xs text-muted-foreground line-clamp-2" title={l.reason}>
                      {l.reason}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RiskPill({ score }: { score: number }) {
  const color =
    score > 80
      ? "bg-destructive/20 text-destructive border-destructive/40"
      : score > 50
      ? "bg-[color:var(--color-warn)]/20 text-[color:var(--color-warn)] border-[color:var(--color-warn)]/40"
      : "bg-primary/15 text-primary border-primary/30";
  return (
    <span className={`inline-flex items-center justify-center min-w-[36px] rounded border px-2 py-0.5 text-xs font-mono ${color}`}>
      {score}
    </span>
  );
}
