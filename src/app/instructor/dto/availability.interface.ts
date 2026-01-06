export interface Slot {
    startTime: string;
    endTime: string;
    date: string;
    isBooked?: boolean; // optional
  }
  
  export interface Day {
    date: string;
    slots: Slot[];
  }
  
  export interface Week {
    weekId: string;
    days: Day[];
  }
  
  export interface InstructorProfile {
    userId: string;
    availability: {
      weeks: Week[];
    };
  }
  