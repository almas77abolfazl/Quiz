export interface Question {
  id: number;
  questionText: string;
  options: QuestionOptions[];
  answerId: number;
}

export interface QuestionOptions {
  id: number;
  description: string;
}

export interface UserAnswers {
  questionNumber: number;
  question: Question;
  userAnswerId: any;
}

export interface User {
  userId?: number;
  username?: string;
  password?: string;
  firstName?:string;
  lastName?:string;
  email?: string;
  authData?: any;
}
