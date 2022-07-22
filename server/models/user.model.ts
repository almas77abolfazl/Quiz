import mongoose, { Schema, Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export enum Gender {
  male = 'male',
  female = 'female',
  undisclosed = 'undisclosed',
}

export interface Address {
  street: string;
  city: string;
  postCode: string;
}

export interface Season {
  token: string;
  expiresAt: number;
}

export interface IUser extends Document {
  sessions: Season[];
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  gender?: Gender;
  address?: Address;
}

const UserSchema: Schema = new Schema({
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
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  // Gets the Mongoose enum from the TypeScript enum
  gender: { type: String, enum: Object.values(Gender) },
  address: {
    street: { type: String },
    city: { type: String },
    postCode: { type: String },
  },
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
});

// Export the model and return your IUser interface
export const UserModel = mongoose.model<IUser>('User', UserSchema);

UserSchema.pre('save', function (next) {
  let user = this;
  let costFactor = 10;

  if (user.isModified('password')) {
    // if the password field has been edited/changed then run this code.

    // Generate salt and hash password
    bcrypt.genSalt(costFactor, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});
