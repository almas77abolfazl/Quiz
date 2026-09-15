export interface CategorySummaryDto {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  questionCount?: number;
}

export interface AdminCategoryDto extends CategorySummaryDto {
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  title?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isActive?: boolean;
}

