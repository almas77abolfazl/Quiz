import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminQuestionDto,
  PaginatedAdminQuestionsDto,
  Difficulty,
  QuestionStatus,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@quiz/contracts';

export interface Category {
  id: string;
  title: string;
  description: string | null;
  coverKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GetQuestionsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  difficulty?: Difficulty;
  status?: QuestionStatus;
}

export interface AdminQuestionOptionInput {
  text: string;
  sortOrder: number;
  isCorrect: boolean;
}

export interface AdminCreateQuestionInput {
  text: string;
  explanation: string;
  difficulty: Difficulty;
  imageKey?: string | null;
  categoryIds: string[];
  questionOptions?: AdminQuestionOptionInput[];
  options?: AdminQuestionOptionInput[];
}

export interface AdminUpdateQuestionInput {
  text?: string;
  explanation?: string;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  imageKey?: string | null;
  categoryIds?: string[];
  questionOptions?: AdminQuestionOptionInput[];
  options?: AdminQuestionOptionInput[];
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  // Category API
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  getCategory(id: string): Observable<Category> {
    return this.http.get<Category>(`/api/categories/${id}`);
  }

  createCategory(dto: CreateCategoryInput): Observable<Category> {
    return this.http.post<Category>('/api/categories', dto);
  }

  updateCategory(id: string, dto: UpdateCategoryInput): Observable<Category> {
    return this.http.put<Category>(`/api/categories/${id}`, dto);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`/api/categories/${id}`);
  }

  // Question API
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

  getQuestion(id: string): Observable<AdminQuestionDto> {
    return this.http.get<AdminQuestionDto>(`/api/questions/${id}`);
  }

  createQuestion(dto: AdminCreateQuestionInput): Observable<AdminQuestionDto> {
    const payload = {
      ...dto,
      questionOptions: dto.questionOptions ?? dto.options ?? [],
    };
    return this.http.post<AdminQuestionDto>('/api/questions', payload);
  }

  updateQuestion(id: string, dto: AdminUpdateQuestionInput): Observable<AdminQuestionDto> {
    const payload: any = { ...dto };
    if (dto.options && !dto.questionOptions) {
      payload.questionOptions = dto.options;
    }
    return this.http.put<AdminQuestionDto>(`/api/questions/${id}`, payload);
  }

  publishQuestion(id: string): Observable<AdminQuestionDto> {
    return this.http.put<AdminQuestionDto>(`/api/questions/${id}/publish`, {});
  }

  deleteQuestion(id: string): Observable<void> {
    return this.http.delete<void>(`/api/questions/${id}`);
  }
}
