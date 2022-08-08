import mongoose, { Schema, Document } from 'mongoose';

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

export interface Session {
  token: string;
  expiresAt: number;
}

export interface IUser extends Document {
  sessions: Session[];
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  address?: string;
  role: Roles;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      minlength: 3,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 3,
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    // Gets the Mongoose enum from the TypeScript enum
    gender: {
      type: String,
      enum: Object.values(Gender),
      default: Gender.undisclosed,
    },
    role: {
      type: String,
      enum: Object.values(Roles),
      default: 'normal',
    },
    address: { type: String, trim: true },
    sessions: [
      {
        token: {
          type: String,
          required: true,
        },
        expiresAt: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Export the model and return your IUser interface
export const UserModel = mongoose.model<IUser>('User', UserSchema);
