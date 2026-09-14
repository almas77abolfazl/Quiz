import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: string;
  title: string;
  description?: string;
  coverKey?: string;
  isActive: boolean;
}

export interface Question {
  id: string;
  text: string;
  explanation: string;
  difficulty: string;
  status: string;
  options: Array<{ id: string; text: string; sortOrder: number; isCorrect: boolean }>;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private readonly http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  createCategory(data: Partial<Category>) {
    return this.http.post<Category>('/api/categories', data);
  }

  updateCategory(id: string, data: Partial<Category>) {
    return this.http.put<Category>(`/api/categories/${id}`, data);
  }

  deleteCategory(id: string) {
    return this.http.delete<void>(`/api/categories/${id}`);
  }

  getQuestions(categoryId?: string) {
    const params: any = {};
    if (categoryId) params.categoryId = categoryId;
    return this.http.get<Question[]>('/api/questions', { params });
  }

  createQuestion(data: Partial<Question>) {
    return this.http.post<Question>('/api/questions', data);
  }

  updateQuestion(id: string, data: Partial<Question>) {
    return this.http.put<Question>(`/api/questions/${id}`, data);
  }

  publishQuestion(id: string) {
    return this.http.put<Question>(`/api/questions/${id}/publish`, {});
  }

  deleteQuestion(id: string) {
    return this.http.delete<void>(`/api/questions/${id}`);
  }
}
