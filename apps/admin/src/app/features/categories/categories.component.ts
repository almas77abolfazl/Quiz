import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService, Category } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);

  // Data State
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly editingCategory = signal<Category | null>(null);
  readonly isSaving = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  // Delete Confirm Modal State
  readonly deletingCategory = signal<Category | null>(null);
  readonly isDeleting = signal<boolean>(false);

  // Form
  categoryForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(250)]],
    coverKey: ['', [Validators.maxLength(200)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.api.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('خطا در دریافت لیست دسته‌بندی‌ها. لطفاً دوباره تلاش کنید.');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingCategory.set(null);
    this.formError.set(null);
    this.categoryForm.reset({
      title: '',
      description: '',
      coverKey: '',
      isActive: true,
    });
    this.isModalOpen.set(true);
  }

  openEditModal(category: Category): void {
    this.editingCategory.set(category);
    this.formError.set(null);
    this.categoryForm.patchValue({
      title: category.title,
      description: category.description || '',
      coverKey: category.coverKey || '',
      isActive: category.isActive,
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingCategory.set(null);
    this.formError.set(null);
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.formError.set('لطفاً اطلاعات ورودی را بررسی کنید. عنوان دسته‌بندی الزامی است.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    const formValue = this.categoryForm.value;
    const currentEditing = this.editingCategory();

    if (currentEditing) {
      const updatePayload = {
        title: formValue.title.trim(),
        description: formValue.description?.trim() || undefined,
        coverKey: formValue.coverKey?.trim() || undefined,
        isActive: Boolean(formValue.isActive),
      };

      this.api.updateCategory(currentEditing.id, updatePayload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.showSuccess('دسته‌بندی با موفقیت ویرایش شد.');
          this.loadCategories();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.message || 'خطا در ویرایش دسته‌بندی.';
          this.formError.set(Array.isArray(msg) ? msg.join('، ') : msg);
        },
      });
    } else {
      const createPayload = {
        title: formValue.title.trim(),
        description: formValue.description?.trim() || undefined,
        coverKey: formValue.coverKey?.trim() || undefined,
      };

      this.api.createCategory(createPayload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.showSuccess('دسته‌بندی جدید با موفقیت ایجاد شد.');
          this.loadCategories();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.message || 'خطا در ایجاد دسته‌بندی.';
          this.formError.set(Array.isArray(msg) ? msg.join('، ') : msg);
        },
      });
    }
  }

  toggleCategoryStatus(category: Category): void {
    const newStatus = !category.isActive;
    this.api.updateCategory(category.id, { isActive: newStatus }).subscribe({
      next: () => {
        const msg = newStatus ? 'دسته‌بندی فعال شد.' : 'دسته‌بندی غیرفعال شد.';
        this.showSuccess(msg);
        this.loadCategories();
      },
      error: () => {
        this.error.set('خطا در تغییر وضعیت دسته‌بندی.');
      },
    });
  }

  confirmDeleteCategory(category: Category): void {
    this.deletingCategory.set(category);
  }

  cancelDelete(): void {
    this.deletingCategory.set(null);
  }

  executeDeleteCategory(): void {
    const target = this.deletingCategory();
    if (!target) return;

    this.isDeleting.set(true);
    this.api.deleteCategory(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deletingCategory.set(null);
        this.showSuccess('دسته‌بندی با موفقیت حذف شد.');
        this.loadCategories();
      },
      error: () => {
        this.isDeleting.set(false);
        this.deletingCategory.set(null);
        this.error.set('خطا در حذف دسته‌بندی.');
      },
    });
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
