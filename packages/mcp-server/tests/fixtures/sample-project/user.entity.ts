import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";

class Organization {
  id!: number;
  name!: string;
}

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  email!: string;

  @ManyToOne(() => Organization)
  organization!: Organization;
}
