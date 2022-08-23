export interface Question {
  _id: string;
  questionText: string;
  options: QuestionOption[];
  level: Levels;
  category: Category;
  creator: User;
  editor?: User;
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
  title: string;
  creator: User;
  editor?: User;
}

enum Levels {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
  veryHard = 'veryHard',
}


export interface Menu {
  displayName: string;
  iconName: string;
  disabled?: boolean;
  route?: string;
  children?: Menu[];
}
