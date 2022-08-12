import mongoose, { Schema, Document } from "mongoose";
import { ICategory } from "./category.model";
import { IUser } from "./user.model";

interface Option {
  optionText: string;
  isAnswer: boolean;
}

enum Levels {
  easy = "easy",
  medium = "medium",
  hard = "hard",
  veryHard = "veryHard",
}

export interface IQuestion extends Document {
  questionText: string;
  options: Option[];
  category: ICategory;
  level: string;
  creator: IUser;
  editor?: IUser;
}

const QuestionSchema: Schema = new Schema(
  {
    questionText: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
      unique: true,
    },

    options: [
      {
        optionText: {
          type: String,
          required: true,
          minlength: 1,
          trim: true,
        },
        isAnswer: {
          type: Boolean,
        },
      },
    ],
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    level: {
      type: String,
      enum: Object.values(Levels),
      default: Levels.easy,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    editor: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
  },
  {
    timestamps: true,
  }
);

// Export the model and return your IQuestion interface
export const QuestionModel = mongoose.model<IQuestion>(
  "Question",
  QuestionSchema
);
