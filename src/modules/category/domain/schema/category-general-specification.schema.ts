import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaAbstract } from '../../../../common/database/abstracts/schema.abstract';

@Schema({ versionKey: false, collection: 'category_general_specification' })
export class CategoryGeneralSpecification extends SchemaAbstract {
  @Prop({
    required: true,
    type: String,
  })
  cat_type: string;

  @Prop({
    required: true,
    type: String,
  })
  subcat_spec_name: string;

  @Prop({
    required: true,
    type: String,
  })
  created_by: string;

  @Prop({
    required: true,
    type: Date,
    default: Date.now,
  })
  created_on: Date;

  @Prop({
    required: true,
    type: String,
  })
  last_updated_by: string;

  @Prop({
    required: true,
    type: Date,
    default: Date.now,
  })
  last_updated_on: Date;

  @Prop({
    required: true,
    type: Boolean,
    default: false,
  })
  is_active: boolean;

  @Prop({
    required: true,
    type: Boolean,
    default: false,
  })
  allow_input: boolean;
}

export const CategoryGeneralSpecificationSchema = SchemaFactory.createForClass(
  CategoryGeneralSpecification,
);
