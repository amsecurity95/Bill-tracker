import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill } from './entities/bill.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(Bill)
    private billsRepository: Repository<Bill>,
  ) {}

  async create(createBillDto: CreateBillDto): Promise<Bill> {
    const bill = this.billsRepository.create({
      ...createBillDto,
      dueDate: new Date(createBillDto.dueDate),
      reminderEnabled: createBillDto.reminderEnabled ?? true,
      isSuperImportant: createBillDto.isSuperImportant ?? false,
      category: createBillDto.category || 'Other',
    });
    return this.billsRepository.save(bill);
  }

  async findAll(): Promise<Bill[]> {
    return this.billsRepository.find({
      order: {
        isSuperImportant: 'DESC',
        dueDate: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Bill> {
    const bill = await this.billsRepository.findOne({ where: { id } });
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }

    return bill;
  }

  async update(id: number, updateBillDto: UpdateBillDto): Promise<Bill> {
    const bill = await this.findOne(id);

    const updateData: any = { ...updateBillDto };
    if (updateBillDto.dueDate) {
      updateData.dueDate = new Date(updateBillDto.dueDate);
    }

    Object.assign(bill, updateData);
    return this.billsRepository.save(bill);
  }

  async remove(id: number): Promise<void> {
    const result = await this.billsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
  }

  async findUpcomingBills(days: number = 7): Promise<Bill[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.billsRepository
      .createQueryBuilder('bill')
      .where('bill.dueDate >= :today', { today })
      .andWhere('bill.dueDate <= :futureDate', { futureDate })
      .andWhere('bill.isPaid = :isPaid', { isPaid: false })
      .andWhere('bill.reminderEnabled = :reminderEnabled', { reminderEnabled: true })
      .getMany();
  }
}

