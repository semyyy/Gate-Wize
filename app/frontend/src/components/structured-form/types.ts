export type FormSpec = {
  name: string;
  description?: string;
  sections: Section[];
};

export type Section = {
  title: string;
  description?: string;
  questions: Question[];
};

export type Question = SimpleQuestion | OptionQuestion | DetailedQuestion | ImageQuestion;

export type PromptConfig = {
  task?: string;
  role?: string;
  guidelines?: string;
};

export type SimpleQuestion = {
  type: 'simple';
  question: string;
  description?: string;
  examples?: string[];
  promptConfig?: PromptConfig;
};

export type OptionQuestion = {
  type: 'option';
  question: string;
  description?: string;
  options: string[];
  justification?: boolean;
  multiple?: boolean; // Enable multiple selection
};



export type DetailedQuestion = {
  type: 'detailed';
  question: string;
  description?: string;
  attributes: DetailedAttribute[]; // columns of a table
};

export type DetailedAttribute = {
  name: string; // "nom"
  description?: string;
  options?: string[]; // when present, the column renders a select
  examples?: string[]; // suggested values for the attribute
  promptConfig?: PromptConfig;
  width?: number; // optional width as decimal (e.g., 0.3 for 30% width)
  inputType?: 'input' | 'textarea'; // optional input type (default: 'input')
} & (
    | { options: string[]; examples?: never }
    | { examples: string[]; options?: never }
    | {}
  );

export type ImageQuestion = {
  type: 'image';
  question: string;
  description?: string;
  url?: string; // Optional default/placeholder image URL
};
