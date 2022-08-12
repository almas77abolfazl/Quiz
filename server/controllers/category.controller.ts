import { NextFunction, Request, Response } from "express";
import { CategoryModel } from "../models/category.model";

export class CategoryController {
  constructor() {}

  async saveCategory(req: Request, res: Response, next: NextFunction) {
    if (req.body._id) {
      await this.updateCategory(req, res, next);
    } else await this.createCategory(req, res, next);
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const newCategory = new CategoryModel(req.body);
      await newCategory.save();
      res
        .status(200)
        .send({ entity: newCategory, message: "messages.savedSuccessfully" });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedCategory = await CategoryModel.findOneAndUpdate(
        {
          _id: req.body._id,
        },
        {
          $set: req.body,
        }
      );
      res.status(200).send({
        entity: updatedCategory,
        message: "messages.updatedSuccessfully",
      });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const allCategories = await CategoryModel.find({}).populate([
        "creator",
        "editor",
      ]);
      allCategories.forEach((c) => {
        c.creator.password = "";
        if (c.editor) {
          c.editor.password = "";
        }
      });
      res.status(200).send(allCategories);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      await CategoryModel.findOneAndRemove({ _id: id });
      res.status(200).send({ message: "messages.deletedSuccessfully" });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const data = await CategoryModel.findOne({ _id: id }).populate([
        "creator",
        "editor",
      ]);
      if (data) {
        data.creator.password = "";
        if (data.editor) {
          data.editor.password = "";
        }
      }

      res.status(200).send({ data });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }
}
