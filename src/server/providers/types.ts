import type { ChatMessageInput } from "../requestGuards";
import type { LanguageTip } from "../../shared/languageTips";
import type { ProactivePromptInput } from "../proactive";

export interface LanguagePartnerResponse {
  response: string;
  tips: LanguageTip[];
}

export interface SpeechResponse {
  audio: string;
  mimeType: string;
}

export interface LanguagePartnerProvider {
  chat(messages: ChatMessageInput[]): Promise<LanguagePartnerResponse>;
  draftProactiveOpener(input: ProactivePromptInput): Promise<LanguagePartnerResponse>;
  speak(text: string): Promise<SpeechResponse>;
}
