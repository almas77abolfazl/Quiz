import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

enum Levels {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
  veryHard = 'veryHard',
}

export interface Option {
  optionText: string;
  isAnswer: boolean;
}

export type QuestionDocument = Question & Document;

@Schema()
export class Question {
  @Prop()
  category: string;

  @Prop()
  questionText: string;

  @Prop()
  options: Option[];

  @Prop({ type: String, enum: Levels, default: Levels.easy })
  level: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop()
  deletedAt?: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
