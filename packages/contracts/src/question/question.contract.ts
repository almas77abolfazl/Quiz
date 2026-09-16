import { Difficulty } from '../enums/difficulty.enum';
import { QuestionStatus } from '../enums/question-status.enum';

export interface PlayerQuestionOptionDto {
  id: string;
  text: string;
  sortOrder: number;
}

export interface PlayerQuestionDto {
  id: string;
  text: string;
  difficulty: Difficulty;
  imageUrl: string | null;
  categoryIds: readonly string[];
  options: readonly PlayerQuestionOptionDto[];
}

export interface AdminQuestionOptionDto {
  id: string;
  text: string;
  sortOrder: number;
  isCorrect: boolean;
}

export interface AdminQuestionDto {
  id: string;
  text: string;
  explanation: string | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  imageUrl: string | null;
  options: readonly AdminQuestionOptionDto[];
  categoryIds: readonly string[];
  tagIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionPaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedAdminQuestionsDto {
  data: readonly AdminQuestionDto[];
  meta: QuestionPaginationMetaDto;
}

export interface AnswerFeedbackDto {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  timedOut: boolean;
  explanation: string | null;
  earnedSeasonPoints: number;
  earnedCoins: number;
}

export interface CreateQuestionOptionInput {
  text: string;
  sortOrder: number;
  isCorrect: boolean;
}

export interface CreateQuestionInput {
  text: string;
  explanation?: string | null;
  difficulty: Difficulty;
  imageUrl?: string | null;
  options: CreateQuestionOptionInput[];
  categoryIds: string[];
  tagIds?: string[];
}

export interface UpdateQuestionInput {
  text?: string;
  explanation?: string | null;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  imageUrl?: string | null;
  options?: CreateQuestionOptionInput[];
  categoryIds?: string[];
  tagIds?: string[];
}

