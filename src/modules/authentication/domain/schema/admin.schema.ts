import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaAbstract } from '../../../../common/database/abstracts/schema.abstract';

@Schema({ versionKey: false, collection: 'admin' })
export class Admin extends SchemaAbstract {
  @Prop({
    required: true,
    type: String,
  })
  user_id: string;

  @Prop({
    required: true,
    type: Date,
    default: Date.now,
  })
  created_on: Date;

  @Prop({
    required: true,
    type: Date,
    default: Date.now,
  })
  last_updated_on: Date;

}

export const AdminSchema = SchemaFactory.createForClass(Admin);