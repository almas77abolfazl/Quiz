import { Difficulty } from '../enums/difficulty.enum';
import { GameStatus } from '../enums/game-status.enum';
import { AnswerStatus } from '../enums/answer-status.enum';
import { PlayerQuestionDto, AnswerFeedbackDto } from '../question/question.contract';

export interface QuizSessionQuestionDto {
  id: string;
  questionId: string;
  position: number;
  startsAt: string | null;
  deadlineAt: string | null;
  question: PlayerQuestionDto;
}

export interface StartQuizRequestDto {
  categoryId?: string;
  difficulty?: Difficulty;
}

export interface StartQuizResponseDto {
  id: string;
  userId: string;
  categoryId: string | null;
  difficulty: Difficulty | null;
  status: GameStatus;
  startedAt: string;
  questions: readonly QuizSessionQuestionDto[];
  containsRepeats: boolean;
  unseenQuestionsRemaining: number;
  eligibleQuestionCount: number;
}

export interface SubmitAnswerRequestDto {
  questionId: string;
  selectedOptionId?: string;
}

export interface SubmitAnswerResponseDto {
  status: AnswerStatus;
  isCorrect: boolean;
  correctOptionId: string;
  feedback: AnswerFeedbackDto;
}

export interface AdvanceQuizResponseDto {
  question: QuizSessionQuestionDto;
  isCompleted: boolean;
}

export interface FinishQuizResponseDto {
  correctAnswers: number;
  incorrectAnswers: number;
  timedOutAnswers: number;
  totalQuestions: number;
  coinsEarned: number;
  seasonPointsEarned: number;
  isRankedGame: boolean;
  dailyRankedGamesUsed: number;
  dailyRankedGamesLimit: number;
  dailyRankedGamesRemaining: number;
}
