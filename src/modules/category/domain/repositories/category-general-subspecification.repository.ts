import { Injectable } from '@nestjs/common';
import { AbstractRepository } from '../../../../common/database/abstracts/repository.abstract';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryGeneralSubspecification } from '../schema/category-general-subspecification.schema';

@Injectable()
export class CategoryGeneralSubspecificationRepository extends AbstractRepository<CategoryGeneralSubspecification> {
  constructor(
    @InjectModel(CategoryGeneralSubspecification.name)
    private readonly categoryGeneralSubspecificationModel: Model<CategoryGeneralSubspecification>,
  ) {
    super(categoryGeneralSubspecificationModel);
  }
}