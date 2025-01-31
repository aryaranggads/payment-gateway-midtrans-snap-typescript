import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  order_id: string;


  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  ppn: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  pju: number;

  @Column()
  transaction_status: string;

  @Column()
  payment_type: string;

  @Column({ nullable: true })
  payment_detail: string; 

  @Column()
  gross_amount: number;

  @Column()
  transaction_time: Date;

  @Column()
  user_id: string;  
}
