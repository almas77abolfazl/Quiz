import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from '../services/api.service';
import { DemoGameDataSource } from './demo-game-data.service';

describe('Real Category Loading', () => {
  let dataSource: DemoGameDataSource;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, DemoGameDataSource, provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    dataSource = TestBed.inject(DemoGameDataSource);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load active categories from the existing API', () => {
    const req = httpMock.expectOne('/api/categories');
    expect(req.request.method).toBe('GET');

    req.flush([
      { id: 'cat_1', title: 'فناوری', description: 'تکنولوژی', coverKey: null, isActive: true },
      { id: 'cat_2', title: 'تاریخ', description: 'تاریخی', coverKey: null, isActive: false },
      { id: 'cat_3', title: 'ورزش', description: 'ورزشی', coverKey: null, isActive: true },
    ]);

    const categories = dataSource.categories();
    expect(categories.length).toBe(2);
    expect(categories[0].id).toBe('cat_1');
    expect(categories[0].title).toBe('فناوری');
    expect(categories[1].id).toBe('cat_3');
    expect(categories[1].title).toBe('ورزش');
  });

  it('should result in empty category state on API failure without mock fallback', () => {
    const req = httpMock.expectOne('/api/categories');
    req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    const categories = dataSource.categories();
    expect(categories).toBeDefined();
    expect(categories.length).toBe(0);
  });
});
