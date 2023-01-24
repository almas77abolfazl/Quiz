import {
  Entity,
  Column,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectIdColumn } from 'typeorm/decorator/columns/ObjectIdColumn';

@Entity('users')
export class CategoryRepository {
  @ObjectIdColumn()
  id: number;

  @Column({ unique: true })
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
