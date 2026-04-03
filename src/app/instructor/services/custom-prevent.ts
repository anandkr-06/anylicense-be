import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
  } from 'class-validator';
import { AvailabilityDayDto } from '../dto/availability-day.dto';
  
  @ValidatorConstraint({ name: 'UniqueDates', async: false })
  export class UniqueDatesConstraint
    implements ValidatorConstraintInterface
  {
    validate(days: AvailabilityDayDto[]) {
      const dates = days.map(d => d.date);
      return new Set(dates).size === dates.length;
    }
  
    defaultMessage(args: ValidationArguments) {
      return 'Duplicate dates found in week';
    }
  }