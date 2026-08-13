import { useNavigate } from "react-router-dom";

export function useChatPrompt(): (prompt: string) => void {
  const navigate = useNavigate();
  return (prompt: string) => navigate("/", { state: { prompt } });
}
