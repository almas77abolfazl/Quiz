import { PlayerQuestionDto, AnswerFeedbackDto } from '@quiz/contracts';

export interface UserAnswerRecord {
  question: PlayerQuestionDto;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  isCorrect: boolean;
  feedback?: AnswerFeedbackDto;
}
