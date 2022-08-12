import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./user.model";

export interface ICategory extends Document {
  title: string;
  creator: IUser;
  editor?: IUser;
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
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    editor: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
