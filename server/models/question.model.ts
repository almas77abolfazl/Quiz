import mongoose, { Schema, Document } from "mongoose";

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
  categoryId: string;
  categoryTitle: string;
  level: string;
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
    categoryId: {
      type: String,
      required: true,
    },
    categoryTitle: {
      type: String,
    },
    level: {
      type: String,
      enum: Object.values(Levels),
      default: Levels.easy,
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
