import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { ObjectIdColumn } from 'typeorm/decorator/columns/ObjectIdColumn';

export enum Gender {
  male = 'male',
  female = 'female',
  undisclosed = 'undisclosed',
}

export enum Roles {
  normal = 'normal',
  admin = 'admin',
  sa = 'sa',
}

@Entity('users')
export class UserEntity {
  @ObjectIdColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column()
  firstName: Date;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: Gender, default: Gender.undisclosed })
  gender: string;

  @Column({ type: 'enum', enum: Roles, default: Roles.normal })
  role: string;

  @Column()
  address: string;

  @Column()
  sessions: string;

  @BeforeUpdate()
  @BeforeInsert()
  emailToLowerCase() {
    this.email = this.email.toLowerCase();
  }
}
