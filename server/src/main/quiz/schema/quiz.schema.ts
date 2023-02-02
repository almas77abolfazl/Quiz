import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { Category } from 'src/admin/category/category.schema';
import { Levels } from 'src/admin/question/question.schema';
import { User } from 'src/core/user/user.schema';
import { Room } from 'src/main/chat/schema/room.schema';
import { QuizResult } from './quiz-result.schema';

export type QuizDocument = Quiz & Document;

@Schema({ timestamps: true })
export class Quiz {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  public user: Types.ObjectId | User;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'QuizResult' })
  public result: Types.ObjectId | QuizResult;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Room' })
  public room: Types.ObjectId | Room;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category' })
  public category: Types.ObjectId | Category;

  @Prop()
  public level: Levels;

  @Prop()
  public score: number;

  @Prop()
  public connectionId: string;

  @Prop()
  deletedAt?: Date;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
