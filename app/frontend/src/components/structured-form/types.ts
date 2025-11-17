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

export type SimpleQuestion = {
  type: 'simple';
  question: string;
  description?: string;
  examples?: string[];
};

export type OptionQuestion = {
  type: 'option';
  question: string;
  description?: string;
  options: string[];
  justification?: boolean;
  examples?: string[];
};



export type DetailedQuestion = {
  type: 'detailed';
  question: string;
  description?: string;
  attributes: DetailedAttribute[]; // columns of a table
  examples?: Record<string, string | number | boolean>[]; // example rows
};
export type DetailedAttribute = {
  name: string; // "nom"
  description?: string;
  options?: string[]; // when present, the column renders a select
};

export type Question = SimpleQuestion | OptionQuestion | DetailedQuestion;



