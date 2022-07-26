export interface Question {
  id: number;
  questionText: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: number;
  questionText: string;
  isAnswer: boolean;
}

export interface UserAnswers {
  questionNumber: number;
  question: Question;
  userAnswerId: any;
}

export interface User {
  _id: string;
  accessToken: string;
  refreshToken: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}
