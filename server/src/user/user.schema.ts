import { Prop, Schema } from '@nestjs/mongoose';
import { SchemaFactory } from '@nestjs/mongoose/dist';
import { Document } from 'mongoose';

export enum Gender {
  male = 'male',
  female = 'female',
  undisclosed = 'undisclosed',
}

export enum Roles {
  normal = 'normal',
  admin = 'admin',
  sa = 'sa',
}

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ unique: true })
  username: string;

  @Prop()
  password: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ type: String, enum: Gender, default: Gender.undisclosed })
  gender: string;

  @Prop({ type: String, enum: Roles, default: Roles.normal })
  role: string;

  @Prop()
  address: string;

  @Prop()
  sessions: any[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop()
  deletedAt?: Date;
}
export const UserSchema = SchemaFactory.createForClass(User);
