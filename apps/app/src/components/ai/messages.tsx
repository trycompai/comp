import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import type { Message as TMessage } from "ai";
import { Message } from "./message";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const [containerRef, endRef] = useScrollToBottom();

  return (
    <div className="h-full flex-1 py-4" ref={containerRef}>
      <div className="mx-auto max-w-xl">
        {messages.map((m, i) => (
          <Message
            key={m.id}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
