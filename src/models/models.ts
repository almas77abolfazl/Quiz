export interface Question {
  _id: number;
  questionText: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  _id: number;
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
