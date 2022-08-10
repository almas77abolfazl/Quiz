export interface Question {
  _id: string;
  questionText: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  _id: string;
  optionText: string;
  isAnswer: boolean;
}

export interface UserAnswers {
  questionNumber: number;
  question: Question;
  userAnswerId: any;
}

export interface User {
  _id: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  role?: string;
}

export interface Command {
  commandName: string;
  label?: string;
  icon?: string;
  // other options
}
export interface Category {
  _id: string;
  categoryTitle: string;
}
