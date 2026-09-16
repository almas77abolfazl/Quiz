import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Difficulty,
  CategorySummaryDto,
  StartQuizResponseDto,
  SubmitAnswerResponseDto,
  FinishQuizResponseDto,
  QuizSessionQuestionDto,
} from '@quiz/contracts';

export type QuizSessionQuestionResponse = QuizSessionQuestionDto;
export type StartQuizResponse = StartQuizResponseDto;
export type SubmitAnswerResponse = SubmitAnswerResponseDto;
export type FinishQuizResponse = FinishQuizResponseDto;

@Injectable({ providedIn: 'root' })
export class SoloQuizApiService {
  private readonly http = inject(HttpClient);

  getCategories(): Observable<CategorySummaryDto[]> {
    return this.http.get<CategorySummaryDto[]>('/api/categories');
  }

  startQuiz(categoryId?: string, difficulty?: Difficulty): Observable<StartQuizResponseDto> {
    const body: { categoryId?: string; difficulty?: Difficulty } = {};
    if (categoryId && categoryId !== 'ALL') {
      body.categoryId = categoryId;
    }
    if (difficulty) {
      body.difficulty = difficulty;
    }
    return this.http.post<StartQuizResponseDto>('/api/quiz/start', body);
  }

  submitAnswer(
    quizSessionId: string,
    questionId: string,
    selectedOptionId?: string,
  ): Observable<SubmitAnswerResponseDto> {
    const body: { questionId: string; selectedOptionId?: string } = { questionId };
    if (selectedOptionId) {
      body.selectedOptionId = selectedOptionId;
    }
    return this.http.post<SubmitAnswerResponseDto>(`/api/quiz/${quizSessionId}/answer`, body);
  }

  finishQuiz(quizSessionId: string): Observable<FinishQuizResponseDto> {
    return this.http.post<FinishQuizResponseDto>(`/api/quiz/${quizSessionId}/finish`, {});
  }
}
