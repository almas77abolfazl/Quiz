import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { User } from 'src/core/user/user.schema';
import { Message } from './message.schema';

export type QuestionRoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  public users: User[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Message' })
  public messages: Message[];

  @Prop()
  deletedAt?: Date;
}

export const QuestionRoomSchema = SchemaFactory.createForClass(Room);
