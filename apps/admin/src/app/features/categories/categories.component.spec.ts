import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CategoriesComponent } from './categories.component';
import { AdminApiService, Category } from '../../core/services/admin-api.service';

describe('CategoriesComponent', () => {
  let component: CategoriesComponent;
  let fixture: ComponentFixture<CategoriesComponent>;
  let apiMock: any;

  const mockSeedCategories: Category[] = [
    {
      id: '00000000-0000-4000-b000-000000000001',
      title: 'اطلاعات عمومی',
      description: 'سوالات دانش عمومی، علمی، طبیعت و مفاهیم کاربردی جهان',
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '00000000-0000-4000-b000-000000000002',
      title: 'تاریخ ایران',
      description: 'سوالات تاریخی ایران از باستان تا دوران معاصر و مشاهیر',
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '00000000-0000-4000-b000-000000000003',
      title: 'جغرافیا',
      description: 'سوالات جغرافیای ایران و جهان، پایتخت‌ها، دریاها و کوه‌ها',
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '00000000-0000-4000-b000-000000000004',
      title: 'فناوری',
      description: 'سوالات علوم رایانه، برنامه‌نویسی، هوش مصنوعی و اینترنت',
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    apiMock = {
      getCategories: vi.fn().mockReturnValue(of(mockSeedCategories)),
    };

    await TestBed.configureTestingModule({
      imports: [CategoriesComponent],
      providers: [{ provide: AdminApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesComponent);
    component = fixture.componentInstance;
  });

  it('should load and render four typed Persian seed categories on success', () => {
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.categories().length).toBe(4);
    expect(component.categories()[0].title).toBe('اطلاعات عمومی');
    expect(component.categories()[1].title).toBe('تاریخ ایران');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('اطلاعات عمومی');
    expect(compiled.textContent).toContain('تاریخ ایران');
    expect(compiled.textContent).toContain('جغرافیا');
    expect(compiled.textContent).toContain('فناوری');
  });

  it('should render empty state when API returns no categories', () => {
    apiMock.getCategories.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.categories().length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('هیچ دسته‌بندی یافت نشد');
  });

  it('should render error state and offer retry when API fails', () => {
    apiMock.getCategories.mockReturnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).not.toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('خطا در دریافت لیست دسته‌بندی‌ها');
    const retryBtn = compiled.querySelector('.error-state button');
    expect(retryBtn?.textContent).toContain('تلاش مجدد');
  });
});
