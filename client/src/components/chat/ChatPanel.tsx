import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendChatMessage } from "@/lib/api";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { QuickChips } from "@/components/chat/QuickChips";
import type { MessageRole } from "@/components/chat/MessageBubble";

type Message = {
  id: string;
  role: MessageRole;
  text: string;
};

const GREETING: Message = {
  id: "greeting",
  role: "ai",
  text:
    "Ciao Sofia! ✨ I'm your AI assistant. I can check trending looks on Instagram, TikTok & YouTube, write scripts for your posts, manage your calendar, summarise your brand DMs, and send you updates on WhatsApp. What do you need today?",
};

function extractPrompt(state: unknown): string | undefined {
  return state && typeof state === "object" && "prompt" in state && typeof state.prompt === "string"
    ? state.prompt
    : undefined;
}

export function ChatPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState(() => extractPrompt(location.state) ?? "");
  const [isTyping, setIsTyping] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hadPromptRef = useRef(extractPrompt(location.state) !== undefined);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (!hadPromptRef.current) return;

    navigate(location.pathname, { replace: true, state: null });
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.style.height = "";
      el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
    }
  }, [location.pathname, navigate]);

  async function handleSend(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
    setShowChips(false);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "";
    setIsTyping(true);

    const result = await sendChatMessage(trimmed);
    setIsTyping(false);

    const replyText = result.success
      ? (result.data.response ?? "Something went wrong — try again.")
      : result.error;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text: replyText }]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isTyping) void handleSend(input);
    }
  }

  function handleInput(): void {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "";
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={messagesRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5.5 py-4.5">
        {messages.map((message) => (
          <MessageBubble key={message.id} role={message.role} text={message.text} />
        ))}
        {isTyping && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-light text-[11px] font-semibold text-pink">
              ✦
            </div>
            <div className="flex items-center gap-0.75 rounded-lg rounded-bl-[4px] bg-surface-secondary px-3.5 py-2.5">
              <span className="inline-block h-1.25 w-1.25 animate-pulse rounded-full bg-text-secondary" />
              <span
                className="inline-block h-1.25 w-1.25 animate-pulse rounded-full bg-text-secondary"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="inline-block h-1.25 w-1.25 animate-pulse rounded-full bg-text-secondary"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border px-5.5 py-3">
        {showChips && <QuickChips onSelect={(text) => void handleSend(text)} />}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            placeholder="Ask me anything…"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className="min-h-9 max-h-22.5 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-normal text-text-primary outline-none focus:border-pink-mid"
          />
          <button
            type="button"
            onClick={() => void handleSend(input)}
            disabled={isTyping}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-pink text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
