export interface Question {
  id: number;
  questionText: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: number;
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
