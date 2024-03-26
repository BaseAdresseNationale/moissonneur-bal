import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { DateEntity } from 'src/lib/schemas/date-entity.schema';

export enum TypePerimeterEnum {
  COMMUNE = 'commune',
  DEPARTEMENT = 'departement',
  EPCI = 'epci',
}

@Schema({ _id: false })
export class Perimeter {
  @Prop({ type: SchemaTypes.String, enum: TypePerimeterEnum })
  type: TypePerimeterEnum;

  @Prop({ type: SchemaTypes.String })
  code: string;
}

export const PerimeterSchema = SchemaFactory.createForClass(Perimeter);

@Schema({ collection: 'organizations' })
export class Organization extends DateEntity {
  @Prop({ type: SchemaTypes.String })
  _id: string;

  @Prop({ type: SchemaTypes.String })
  logo: string;

  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  page: string;

  @Prop({ type: [PerimeterSchema] })
  perimeters?: Perimeter[];
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
