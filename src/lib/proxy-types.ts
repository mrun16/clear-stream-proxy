export type Verdict = "allowed" | "blocked";

export type LogEntry = {
  id: string;
  ts: number;
  sessionId: string;
  preview: string;
  hadFile: boolean;
  riskScore: number;
  verdict: Verdict;
  reason: string;
  stage: "intent" | "output" | "ok" | "error";
};

export type ChatResponse = {
  ok: boolean;
  reply?: string;
  blocked?: boolean;
  reason?: string;
  riskScore: number;
  stage: LogEntry["stage"];
  logId: string;
};
