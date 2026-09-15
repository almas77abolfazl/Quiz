import {
  PlayerQuestionOptionDto,
  AdminQuestionOptionDto,
  AdminCategoryDto,
  CategorySummaryDto,
  Difficulty,
  QuestionStatus,
  PlayerQuestionDto,
  AdminQuestionDto,
  AnswerFeedbackDto
} from '../src';

// Valid Player Option
const validPlayerOption: PlayerQuestionOptionDto = {
  id: 'option-1',
  text: 'Valid Option',
  sortOrder: 1,
};

// @ts-expect-error Player options must never expose answer correctness
const unsafePlayerOption: PlayerQuestionOptionDto = {
  id: 'option-1',
  text: 'Unsafe Option',
  sortOrder: 1,
  isCorrect: true,
};

// Valid Admin Option (requires isCorrect)
const validAdminOption: AdminQuestionOptionDto = {
  id: 'option-1',
  text: 'Admin Option',
  sortOrder: 1,
  isCorrect: true,
};

// @ts-expect-error Admin options must specify isCorrect
const incompleteAdminOption: AdminQuestionOptionDto = {
  id: 'option-1',
  text: 'Incomplete Admin Option',
  sortOrder: 1,
};

// Valid Category Summary
const categorySummary: CategorySummaryDto = {
  id: 'cat-1',
  title: 'General',
  description: null,
  coverImageUrl: null,
  isActive: true,
};

// Valid Admin Category (dates must be ISO strings, not Date)
const adminCategory: AdminCategoryDto = {
  ...categorySummary,
  createdAt: '2026-09-15T12:00:00.000Z',
  updatedAt: '2026-09-15T12:00:00.000Z',
};

// @ts-expect-error Category DTO timestamps must be string, not Date
const invalidDateCategory: AdminCategoryDto = {
  ...categorySummary,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Valid Player Question
const playerQuestion: PlayerQuestionDto = {
  id: 'q-1',
  text: 'Sample question?',
  difficulty: Difficulty.EASY,
  imageUrl: null,
  categoryIds: ['cat-1'],
  options: [validPlayerOption],
};

// Valid Admin Question
const adminQuestion: AdminQuestionDto = {
  id: 'q-1',
  text: 'Sample question?',
  explanation: 'Sample explanation',
  difficulty: Difficulty.EASY,
  status: QuestionStatus.PUBLISHED,
  imageUrl: null,
  options: [validAdminOption],
  categoryIds: ['cat-1'],
  tagIds: [],
  createdAt: '2026-09-15T12:00:00.000Z',
  updatedAt: '2026-09-15T12:00:00.000Z',
};

// Valid Answer Feedback
const answerFeedback: AnswerFeedbackDto = {
  questionId: 'q-1',
  selectedOptionId: 'option-1',
  correctOptionId: 'option-1',
  isCorrect: true,
  timedOut: false,
  explanation: 'Sample explanation',
  earnedSeasonPoints: 1,
  earnedCoins: 1,
};

console.log('✅ Type tests compiled successfully.');

