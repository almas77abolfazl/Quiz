import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  title: string;
}

const CategorySchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Export the model and return your ICategory interface
export const CategoryModel = mongoose.model<ICategory>(
  "Category",
  CategorySchema
);
