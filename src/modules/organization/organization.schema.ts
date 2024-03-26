import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';
import { DateEntity } from 'src/lib/class/dates.schema';

export enum TypePerimeterEnum {
  COMMUNE = 'commune',
  DEPARTEMENT = 'departement',
  EPCI = 'epci',
}

@Schema({ _id: false })
export class Perimeter {
  @IsDefined()
  @IsEnum(TypePerimeterEnum)
  @Prop({ type: SchemaTypes.String, enum: TypePerimeterEnum })
  @ApiProperty({ enum: TypePerimeterEnum, required: false })
  type: TypePerimeterEnum;

  @IsDefined()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  code: string;
}

export const PerimeterSchema = SchemaFactory.createForClass(Perimeter);

@Schema({ collection: 'organizations' })
export class Organization extends DateEntity {
  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  _id: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  logo: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  name: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  page: string;

  @Prop({ type: [PerimeterSchema] })
  @ApiProperty({ type: () => Perimeter, required: false, isArray: true })
  perimeters?: Perimeter[];
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
