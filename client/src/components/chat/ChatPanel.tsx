import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { reviseScript, saveScript, sendChatMessage } from "@/lib/api";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { QuickChips } from "@/components/chat/QuickChips";
import { ScriptEditBanner } from "@/components/chat/ScriptEditBanner";
import type { MessageRole } from "@/components/chat/MessageBubble";
import type { Script, ScriptDraft } from "@/lib/types";

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

function extractEditScript(state: unknown): Script | undefined {
  if (!state || typeof state !== "object" || !("editScript" in state)) return undefined;
  const value = state.editScript;
  if (!value || typeof value !== "object" || !("kind" in value) || !("_id" in value)) return undefined;
  // location.state's `editScript` is only ever set by ScriptCard's Edit chip
  // (see goToEdit there) — router state is a controlled internal channel here,
  // not arbitrary external input, so a structural check plus this assertion
  // is the same tradeoff extractPrompt already makes for the `prompt` field.
  return value as Script;
}

function resizeTextarea(el: HTMLTextAreaElement): void {
  el.style.height = "";
  el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
}

function toScriptDraft(script: Script): ScriptDraft {
  if (script.kind === "reel") {
    return { kind: "reel", title: script.title, hook: script.hook, body: script.body, cta: script.cta, hashtags: script.hashtags };
  }
  if (script.kind === "caption") {
    return { kind: "caption", title: script.title, variants: script.variants, hashtags: script.hashtags };
  }
  // ScriptCard's Edit chip only renders for reel/caption kinds — carousel
  // never reaches this path (content-agent doesn't generate it, feature 11).
  throw new Error("Cannot edit a carousel script");
}

function mergeDraft(current: Script, draft: ScriptDraft): Script {
  if (current.kind === "reel" && draft.kind === "reel") {
    return { ...current, title: draft.title, hook: draft.hook, body: draft.body, cta: draft.cta, hashtags: draft.hashtags };
  }
  if (current.kind === "caption" && draft.kind === "caption") {
    return { ...current, title: draft.title, variants: draft.variants, hashtags: draft.hashtags };
  }
  return current;
}

function formatDraftMessage(draft: ScriptDraft): string {
  if (draft.kind === "reel") {
    return `Hook: ${draft.hook}\n\nBody: ${draft.body}\n\nCTA: ${draft.cta}`;
  }
  return draft.variants.map((variant, index) => `Option ${index + 1}: ${variant}`).join("\n\n");
}

export function ChatPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState(() => extractPrompt(location.state) ?? "");
  const [isTyping, setIsTyping] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [editingScript, setEditingScript] = useState<Script | null>(() => extractEditScript(location.state) ?? null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hadLocationStateRef = useRef(
    extractPrompt(location.state) !== undefined || extractEditScript(location.state) !== undefined
  );

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (!hadLocationStateRef.current) return;

    navigate(location.pathname, { replace: true, state: null });
    const el = textareaRef.current;
    if (el) {
      el.focus();
      resizeTextarea(el);
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

    if (editingScript) {
      setEditError(null); // a stale failed-Save error shouldn't linger through a successful revise turn
      if (!editingScript._id) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "ai", text: "Something's off with this script — try reopening it from the library." },
        ]);
        return;
      }
      const result = await reviseScript(editingScript._id, toScriptDraft(editingScript), trimmed);
      setIsTyping(false);
      if (result.success) {
        setEditingScript((prev) => (prev ? mergeDraft(prev, result.data) : prev));
      }
      const replyText = result.success ? formatDraftMessage(result.data) : result.error;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text: replyText }]);
      return;
    }

    const result = await sendChatMessage(trimmed);
    setIsTyping(false);

    const replyText = result.success
      ? (result.data.response ?? "Something went wrong — try again.")
      : result.error;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text: replyText }]);
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editingScript?._id) return;
    setIsSavingEdit(true);
    setEditError(null);
    const result = await saveScript(editingScript._id, toScriptDraft(editingScript));
    setIsSavingEdit(false);
    if (result.success) {
      const savedTitle = editingScript.title;
      setEditingScript(null);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", text: `Saved — "${savedTitle}" is updated in your library. ✨` },
      ]);
    } else {
      setEditError(result.error);
    }
  }

  function handleDiscardEdit(): void {
    setEditingScript(null);
    setEditError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isTyping && !isSavingEdit) void handleSend(input);
    }
  }

  function handleInput(): void {
    const el = textareaRef.current;
    if (!el) return;
    resizeTextarea(el);
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
        {editingScript ? (
          <ScriptEditBanner
            title={editingScript.title}
            onSave={() => void handleSaveEdit()}
            onDiscard={handleDiscardEdit}
            busy={isSavingEdit || isTyping}
            error={editError}
          />
        ) : (
          showChips && <QuickChips onSelect={(text) => void handleSend(text)} />
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            placeholder={editingScript ? "Tell me what to change…" : "Ask me anything…"}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className="min-h-9 max-h-22.5 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-normal text-text-primary outline-none focus:border-pink-mid"
          />
          <button
            type="button"
            onClick={() => void handleSend(input)}
            disabled={isTyping || isSavingEdit}
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
