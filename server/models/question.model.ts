import mongoose, { Schema, Document } from 'mongoose';

interface Option {
  optionText: string;
  isAnswer: boolean;
}

export interface IQuestion extends Document {
  questionText: string;
  options: Option[];
}

const QuestionSchema: Schema = new Schema({
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
});

// Export the model and return your IQuestion interface
export const QuestionModel = mongoose.model<IQuestion>(
  'Question',
  QuestionSchema
);
