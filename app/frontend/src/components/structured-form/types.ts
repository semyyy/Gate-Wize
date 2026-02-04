/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export type FormSpec = {
  name: string;
  description?: string;
  status: 'draft' | 'published';
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
  multiple?: boolean; // Enable multiple responses
  aiValidation?: boolean; // Enable/disable AI validation (default: true)
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
  aiValidation?: boolean; // Enable/disable AI validation (default: true)
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
