import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number | null) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return Number.parseFloat(value);
        return 0;
      },
    },
  })
  amount: number;

  @Column()
  dueDate: Date;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ nullable: true })
  description: string;

  @Column()
  email: string;

  @Column({ default: true })
  reminderEnabled: boolean;

  @Column({ default: false })
  isSuperImportant: boolean;

  @Column({ default: 'Other' })
  category: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

