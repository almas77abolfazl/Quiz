import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Difficulty,
  GameStatus,
  AnswerStatus,
  PlayerQuestionDto,
  AnswerFeedbackDto,
  CategorySummaryDto,
} from '@quiz/contracts';

export interface QuizSessionQuestionResponse {
  id: string;
  questionId: string;
  position: number;
  startsAt: string;
  deadlineAt: string;
  question: PlayerQuestionDto;
}

export interface StartQuizResponse {
  id: string;
  userId: string;
  categoryId: string | null;
  difficulty: Difficulty | null;
  status: GameStatus;
  startedAt: string;
  questions: QuizSessionQuestionResponse[];
}

export interface SubmitAnswerResponse {
  status: AnswerStatus;
  isCorrect: boolean;
  correctOptionId: string;
  feedback: AnswerFeedbackDto;
}

export interface FinishQuizResponse {
  correctAnswers: number;
  totalQuestions: number;
  coinsEarned: number;
}

@Injectable({ providedIn: 'root' })
export class SoloQuizApiService {
  private readonly http = inject(HttpClient);

  getCategories(): Observable<CategorySummaryDto[]> {
    return this.http.get<CategorySummaryDto[]>('/api/categories');
  }

  startQuiz(categoryId?: string, difficulty?: Difficulty): Observable<StartQuizResponse> {
    const body: { categoryId?: string; difficulty?: Difficulty } = {};
    if (categoryId && categoryId !== 'ALL') {
      body.categoryId = categoryId;
    }
    if (difficulty) {
      body.difficulty = difficulty;
    }
    return this.http.post<StartQuizResponse>('/api/quiz/start', body);
  }

  submitAnswer(
    quizSessionId: string,
    questionId: string,
    selectedOptionId?: string,
  ): Observable<SubmitAnswerResponse> {
    const body: { questionId: string; selectedOptionId?: string } = { questionId };
    if (selectedOptionId) {
      body.selectedOptionId = selectedOptionId;
    }
    return this.http.post<SubmitAnswerResponse>(`/api/quiz/${quizSessionId}/answer`, body);
  }

  finishQuiz(quizSessionId: string): Observable<FinishQuizResponse> {
    return this.http.post<FinishQuizResponse>(`/api/quiz/${quizSessionId}/finish`, {});
  }
}
