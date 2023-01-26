import {
  Entity,
  Column,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectID,
  PrimaryColumn,
} from 'typeorm';
import { ObjectIdColumn } from 'typeorm/decorator/columns/ObjectIdColumn';

@Entity('category')
export class CategoryRepository {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  title: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeUpdate()
  @BeforeInsert()
  firstLetterOfTitleToUpperCaseAndTrim(): void {
    const title = this.title.trim();
    title.charAt(0).toUpperCase() + title.slice(1);
    this.title = title;
  }
}
