export type MessageRole = "ai" | "user";

type Props = {
  role: MessageRole;
  text: string;
};

export function MessageBubble({ role, text }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          isUser ? "bg-coral-light text-coral" : "bg-pink-light text-pink"
        }`}
      >
        {isUser ? "SC" : "✦"}
      </div>
      <div
        className={`max-w-[75%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-[1.55] ${
          isUser
            ? "rounded-br-[4px] bg-pink-light text-pink-dark"
            : "rounded-bl-[4px] bg-surface-secondary text-text-primary"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
