import { AdminQuestionDto, PlayerQuestionDto } from '@quiz/contracts';

export function mapToAdminQuestionDto(q: any): AdminQuestionDto {
  return {
    id: q.id,
    text: q.text,
    explanation: q.explanation ?? null,
    difficulty: q.difficulty,
    status: q.status,
    imageUrl: q.imageUrl ?? q.imageKey ?? null,
    options: (q.options ?? []).map((opt: any) => ({
      id: opt.id,
      text: opt.text,
      sortOrder: opt.sortOrder,
      isCorrect: Boolean(opt.isCorrect),
    })),
    categoryIds: (q.categories ?? [])
      .map((c: any) => (typeof c === 'string' ? c : c.categoryId ?? c.category?.id))
      .filter((id: any): id is string => typeof id === 'string'),
    tagIds: (q.tags ?? [])
      .map((t: any) => (typeof t === 'string' ? t : t.tagId ?? t.tag?.id))
      .filter((id: any): id is string => typeof id === 'string'),
    createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : String(q.createdAt ?? ''),
    updatedAt: q.updatedAt instanceof Date ? q.updatedAt.toISOString() : String(q.updatedAt ?? ''),
  };
}

export function mapToPlayerQuestionDto(q: any): PlayerQuestionDto {
  return {
    id: q.id,
    text: q.text,
    difficulty: q.difficulty,
    imageUrl: q.imageUrl ?? q.imageKey ?? null,
    categoryIds: (q.categories ?? [])
      .map((c: any) => (typeof c === 'string' ? c : c.categoryId ?? c.category?.id))
      .filter((id: any): id is string => typeof id === 'string'),
    options: (q.options ?? []).map((opt: any) => ({
      id: opt.id,
      text: opt.text,
      sortOrder: opt.sortOrder,
    })),
  };
}

