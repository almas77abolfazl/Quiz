import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedAdminQuestionsDto, Difficulty, QuestionStatus } from '@quiz/contracts';

export interface Category {
  id: string;
  title: string;
  description: string | null;
  coverKey: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface GetQuestionsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  difficulty?: Difficulty;
  status?: QuestionStatus;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  getQuestions(params: GetQuestionsParams = {}): Observable<PaginatedAdminQuestionsDto> {
    let httpParams = new HttpParams();

    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined && params.limit !== null) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.categoryId && params.categoryId.trim()) {
      httpParams = httpParams.set('categoryId', params.categoryId.trim());
    }
    if (params.difficulty) {
      httpParams = httpParams.set('difficulty', params.difficulty);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<PaginatedAdminQuestionsDto>('/api/questions', { params: httpParams });
  }
}
