export type CardStatus = 'TODO' | 'IN PROGRESS' | 'REVIEW' | 'COMPLETED';
export type CardPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Task {
  text: string;
  completed: boolean;
}

export interface Card {
  filename: string;
  project: string;
  absolutePath: string;
  title: string;
  status: CardStatus | null;
  priority: CardPriority | null;
  description: string;
  tasks: Task[];
  comments: string;
  createdAt: string;
  modifiedAt: string;
  hasErrors: boolean;
  errorMessages: string[];
  rawSections: RawSection[];
}

export interface RawSection {
  heading: string;
  content: string;
}
