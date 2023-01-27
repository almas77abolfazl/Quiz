import { CategoryRepository } from 'src/category/category.repository';
import {
  Entity,
  Column,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectID,
} from 'typeorm';
import { ObjectIdColumn } from 'typeorm/decorator/columns/ObjectIdColumn';

enum Levels {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
  veryHard = 'veryHard',
}

export interface Option {
  optionText: string;
  isAnswer: boolean;
}

@Entity('question')
export class QuestionRepository {
  @ObjectIdColumn()
  _id: ObjectID;

  @ObjectIdColumn({ name: 'category' })
  category: ObjectID | CategoryRepository;

  @Column()
  questionText: string;

  @Column()
  options: Option[];

  @Column({ type: 'enum', enum: Levels, default: Levels.easy })
  level: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeUpdate()
  @BeforeInsert()
  firstLetterOfTitleToUpperCaseAndTrim(): void {
    // const title = this.title.trim();
    // title.charAt(0).toUpperCase() + title.slice(1);
    // this.title = title;
  }
}
