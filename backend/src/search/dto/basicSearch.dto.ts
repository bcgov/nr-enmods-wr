import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from "class-validator";

export class BasicSearchDto {
  @ValidateIf((obj) => obj.locationType !== null)
  @IsNotEmpty({ message: "Location Type should not be empty" })
  public readonly locationType: any | null;

  @ValidateIf((obj) => obj.locationName.length > 0)
  @IsArray()
  public readonly locationName: any[];

  @ValidateIf((obj) => obj.permitNumber.length > 0)
  @IsArray()
  public readonly permitNumber: any[];

  @ValidateIf((obj) => obj.fromDate !== null)
  @IsDate({ message: "Please enter valid From date" })
  @Type(() => Date)
  public readonly fromDate: Date;

  @ValidateIf((obj) => obj.toDate !== null)
  @IsDate({ message: "Please enter valid To date" })
  @Type(() => Date)
  public readonly toDate: Date;

  @ValidateIf((obj) => obj.media.length > 0)
  @IsArray()
  public readonly media: any[];

  @ValidateIf((obj) => obj.observedPropertyGrp.length > 0)
  @IsArray()
  public readonly observedPropertyGrp: any[];

  @ValidateIf((obj) => obj.projects.length > 0)
  @IsArray()
  public readonly projects: any[];

  @IsOptional()
  public readonly fileFormat: string;

  public readonly observedProperty: any[];
  public readonly workedOrderNumber: any[];
  public readonly samplingAgency: any[];
  public readonly analyzingAgency: any[];
  public readonly analyticalMethod: any[];

  public readonly labArrivalFromDate: Date;
  public readonly labArrivalToDate: Date;
  public readonly collectionMethod: any[];
  public readonly qcSampleType: any[];
  public readonly dataClassification: any[];
  public readonly sampleDepth: any[];
  public readonly units: any[];
  public readonly labBatchId : any | null;
  public readonly specimenId: any[];
}
