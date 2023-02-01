import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum Levels {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
  veryHard = 'veryHard',
}

export interface Option {
  _id: string;
  optionText: string;
  isAnswer: boolean;
}

export type QuestionDocument = Question & Document;

@Schema({ timestamps: true })
export class Question {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ required: true })
  questionText: string;

  @Prop({ required: true })
  options: Option[];

  @Prop({ type: String, enum: Levels, default: Levels.easy, required: true })
  level: string;

  @Prop()
  deletedAt?: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
