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
      res.status(404).send(error.message);
    }
  }
}
