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
      id: 'cat-1',
      title: 'اطلاعات عمومی',
      description: 'سوالات عمومی',
      coverKey: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-2',
      title: 'تاریخ ایران',
      description: 'تاریخ باستان',
      coverKey: null,
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    apiMock = {
      getCategories: vi.fn().mockReturnValue(of(mockSeedCategories)),
      createCategory: vi
        .fn()
        .mockImplementation((dto) =>
          of({ id: 'cat-3', ...dto, createdAt: new Date().toISOString() }),
        ),
      updateCategory: vi
        .fn()
        .mockImplementation((id, dto) => of({ ...mockSeedCategories[0], ...dto })),
      deleteCategory: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [CategoriesComponent],
      providers: [{ provide: AdminApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesComponent);
    component = fixture.componentInstance;
  });

  it('1. should load and render categories on success', () => {
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.categories().length).toBe(2);
    expect(component.categories()[0].title).toBe('اطلاعات عمومی');
  });

  it('2. should render empty state when no categories', () => {
    apiMock.getCategories.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.categories().length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('هیچ دسته‌بندی یافت نشد');
  });

  it('3. should render error state on load error', () => {
    apiMock.getCategories.mockReturnValue(throwError(() => new Error('API Fail')));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).not.toBeNull();
  });

  it('4. should open create modal and save new category', () => {
    fixture.detectChanges();
    component.openCreateModal();
    expect(component.isModalOpen()).toBe(true);

    component.categoryForm.patchValue({
      title: 'ورزش',
      description: 'سوالات ورزشی',
    });

    component.saveCategory();

    expect(apiMock.createCategory).toHaveBeenCalledWith({
      title: 'ورزش',
      description: 'سوالات ورزشی',
      coverKey: undefined,
    });
    expect(component.isModalOpen()).toBe(false);
  });

  it('5. should open edit modal and save updated category', () => {
    fixture.detectChanges();
    component.openEditModal(mockSeedCategories[0]);
    expect(component.editingCategory()?.id).toBe('cat-1');

    component.categoryForm.patchValue({
      title: 'اطلاعات عمومی (بروزرسانی)',
    });

    component.saveCategory();

    expect(apiMock.updateCategory).toHaveBeenCalledWith('cat-1', {
      title: 'اطلاعات عمومی (بروزرسانی)',
      description: 'سوالات عمومی',
      coverKey: undefined,
      isActive: true,
    });
  });

  it('6. should toggle category active state', () => {
    fixture.detectChanges();
    component.toggleCategoryStatus(mockSeedCategories[0]);

    expect(apiMock.updateCategory).toHaveBeenCalledWith('cat-1', { isActive: false });
  });

  it('7. should delete category after confirmation', () => {
    fixture.detectChanges();
    component.confirmDeleteCategory(mockSeedCategories[0]);
    expect(component.deletingCategory()?.id).toBe('cat-1');

    component.executeDeleteCategory();

    expect(apiMock.deleteCategory).toHaveBeenCalledWith('cat-1');
    expect(component.deletingCategory()).toBeNull();
  });
});
