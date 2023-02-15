import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export interface Answer {
  questionId: string;
  answerWasCorrect: boolean;
}

export type QuizResultDocument = QuizResult & Document;

@Schema({ timestamps: true })
export class QuizResult {
  @Prop()
  public answers: Answer[];

  @Prop()
  deletedAt?: Date;
}

export const QuizResultSchema = SchemaFactory.createForClass(QuizResult);
