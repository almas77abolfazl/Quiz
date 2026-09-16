import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Difficulty, QuestionStatus } from '@quiz/contracts';
import { AdminApiService } from './admin-api.service';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminApiService],
    });

    service = TestBed.inject(AdminApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getQuestions should serialize query parameters correctly', () => {
    service
      .getQuestions({
        page: 2,
        limit: 50,
        search: 'تاریخ',
        categoryId: 'cat-123',
        difficulty: Difficulty.MEDIUM,
        status: QuestionStatus.PUBLISHED,
      })
      .subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === '/api/questions' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '50' &&
        request.params.get('search') === 'تاریخ' &&
        request.params.get('categoryId') === 'cat-123' &&
        request.params.get('difficulty') === 'MEDIUM' &&
        request.params.get('status') === 'PUBLISHED',
    );

    expect(req.request.method).toBe('GET');
    req.flush({
      data: [],
      meta: {
        page: 2,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasPreviousPage: true,
        hasNextPage: false,
      },
    });
  });

  it('getQuestions should omit empty or undefined query parameters', () => {
    service.getQuestions({ page: 1, limit: 20 }).subscribe();

    const req = httpMock.expectOne((request) => request.url === '/api/questions');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('categoryId')).toBe(false);
    expect(req.request.params.has('difficulty')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);

    req.flush({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
  });
});
