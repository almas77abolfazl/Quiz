import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Question } from 'src/admin/question/question.schema';

export interface Answer {
  questionId: string;
  answer: string;
}

export type QuizResultDocument = QuizResult & Document;

@Schema({ timestamps: true })
export class QuizResult {
  @Prop()
  public questions: Question[];

  @Prop()
  public answers: Answer[];

  @Prop()
  deletedAt?: Date;
}

export const QuizResultSchema = SchemaFactory.createForClass(QuizResult);
