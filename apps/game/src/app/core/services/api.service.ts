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

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  startQuiz(categoryId?: string) {
    return this.http.post('/api/quiz/start', { categoryId });
  }
}
