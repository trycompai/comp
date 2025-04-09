import type {
  TechStackOption as BaseTechStackOption,
  BaseQuestion,
} from "./home.types";

export type TechStackOption = BaseTechStackOption;

export interface MultiSelectQuestionData extends BaseQuestion {
  type: "multi-select";
  options: TechStackOption[];
}

export interface MultiSelectQuestionProps {
  title: string;
  description?: string;
  options: TechStackOption[];
}
