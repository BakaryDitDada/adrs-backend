export type ReportStreamEvent =
  | {
      type: "thinking";
      message: string;
    }
  | {
      type: "token";
      content: string;
    }
  | {
      type: "done";
      report: string;
    }
  | {
      type: "error";
      message: string;
    };

// Stream event type for sendMessageStream
export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: "conversation"; conversationId: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; content: string }
  | { type: 'done' }
  | { type: 'error'; content: string };