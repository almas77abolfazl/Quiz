import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AdminApiService, Category } from '../../core/services/admin-api.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let apiMock: any;

  const mockCategories: Category[] = [
    {
      id: '1',
      title: 'C1',
      description: null,
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01',
    },
    {
      id: '2',
      title: 'C2',
      description: null,
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01',
    },
    {
      id: '3',
      title: 'C3',
      description: null,
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01',
    },
    {
      id: '4',
      title: 'C4',
      description: null,
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01',
    },
  ];

  beforeEach(async () => {
    apiMock = {
      getCategories: vi.fn().mockReturnValue(of(mockCategories)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), { provide: AdminApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should display the real category count of 4 on success', () => {
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.categoryCount()).toBe(4);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('4');
  });

  it('should render error state if loading categories fails', () => {
    apiMock.getCategories.mockReturnValue(throwError(() => new Error('API failure')));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).not.toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('خطا در بارگذاری آمار دسته‌بندی‌ها');
  });
});
