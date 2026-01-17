export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  isBooked?: boolean;
}

export interface AvailabilityDayDTO {
  date: string;
  slots: AvailabilitySlot[];
}

export interface AvailabilityAggResult {
  weekId: string;
  startDate: string;
  endDate: string;
  date: string;
  slots: any[];
  isBooked?: boolean;
}