import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateDocumentDto } from './update-document.dto';

export class UpdateDocumentsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentDto)
  certificateOfCurrency?: UpdateDocumentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentDto)
  vehicleInspectionCertificate?: UpdateDocumentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentDto)
  industryAuthorityCard?: UpdateDocumentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentDto)
  vehicleRegistration?: UpdateDocumentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentDto)
  driverLicence?: UpdateDocumentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentDto)
  blueCard?: UpdateDocumentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentDto)
  certificateIvMotorVehicleTraining?: UpdateDocumentDto;
}