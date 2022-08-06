import { Request, Response } from 'express';
import { QuestionModel } from '../models/question.model';

export class QuestionController {
  constructor() {}

  async createQuestion(req: Request, res: Response) {
    try {
      const newQuestion = new QuestionModel(req.body);
      await newQuestion.save();
      res.status(200).send(newQuestion);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async updateQuestion(req: Request, res: Response) {
    try {
      const updatedQuestion = await QuestionModel.findOneAndUpdate(
        {
          _id: req.body._id,
        },
        {
          $set: req.body,
        }
      );
      res.status(200).send(updatedQuestion);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async getQuestions(req: Request, res: Response) {
    try {
      const allQuestions = await QuestionModel.find({});
      res.status(200).send(allQuestions);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async getRandom(req: Request, res: Response) {
    try {
      const getRandom = await QuestionModel.aggregate([
        {
          $sample: { size: 1 },
        },
      ]);
      res.status(200).send(getRandom);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async deleteQuestion(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await QuestionModel.findOneAndRemove({ _id: id });
      res.status(200).send({ message: 'successfully deleted' });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  async getQuestionById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const data = await QuestionModel.findOne({ _id: id });
      res.status(200).send({ data });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }
}
