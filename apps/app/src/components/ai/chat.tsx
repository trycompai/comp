"use client";

import type { modelID } from "@/hooks/ai/providers";
import { useSession } from "@/utils/auth-client";
import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@comp/ui/scroll-area";
import { useState } from "react";
import { ChatEmpty } from "./chat-empty";
import { ChatTextarea } from "./chat-text-area";
import { Messages } from "./messages";

export default function Chat() {
  const { data: session } = useSession();

  const [selectedModel, setSelectedModel] = useState<modelID>(
    "deepseek-r1-distill-llama-70b",
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    status,
    stop,
  } = useChat({
    maxSteps: 5,
    body: {
      selectedModel,
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  if (error) return <div>{error.message}</div>;

  return (
    <div className="relative flex h-full flex-col">
      <ScrollArea className="h-[calc(100vh-100px)]">
        {messages.length === 0 ? (
          <div className="mx-auto w-full max-w-xl">
            <ChatEmpty
              firstName={session?.user?.name?.split(" ").at(0) ?? ""}
            />
          </div>
        ) : (
          <Messages messages={messages} isLoading={isLoading} status={status} />
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit}>
        <ChatTextarea
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          handleInputChange={handleInputChange}
          input={input}
          isLoading={isLoading}
          status={status}
          stop={stop}
        />
      </form>
    </div>
  );
}
