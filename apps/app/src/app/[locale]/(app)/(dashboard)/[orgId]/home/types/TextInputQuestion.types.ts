import type { BaseQuestion } from "./home.types"; // Updated path

export interface TextInputQuestionData extends BaseQuestion {
  type: "text";
}

export interface TextInputQuestionProps {
  title: string;
  description?: string;
}
