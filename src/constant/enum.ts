export enum FeedbackOwnerType {
  LEARNER = 'learner',
  INSTRUCTOR = 'instructor',
}

export enum FeedbackType {
  SUPPORT = 'SUPPORT',
    SUGGESTIONS = 'SUGGESTIONS',
    QUESTIONS = 'QUESTIONS',
    NOSHOW = 'NOSHOW',
  }
  
  export enum courseCategory {
    TRUCK = 'TRUCK',
    BIKE = 'BIKE',
    DANGEROUS_GOODS = 'DANGEROUS GOODS',
    FORK_LIFT = 'FORK LIFT',
    MACHINERY = 'MACHINERY',
    WHITE_CARD = "WHITE CARD",
  }


  export enum courseType {
    WEEKEND = 'Weekend',
    WEEKDAY = 'Weekday',
    WEEKEND_WEEKDAY = 'Weekend & Weekday',
    FLEXIBLE = 'Flexible Date',
  }

  export enum courseStatus {
    PENDING = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
  }

  export enum OrderStatus {
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    PAID = 'PAID',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
  }
  
  export enum VehicleType {
    AUTO = 'auto',
    MANUAL = 'manual',
  }

  export const NO_SHOW_REASONS = [
    { value: "1", label: "Learner forgot the booking" },
    { value: "2", label: "Learner said they were sick" },
    { value: "3", label: "Learner was not at the pickup location" },
    { value: "4", label: "Incorrect pickup address provided" },
    { value: "5", label: "Parent forgot to inform learner" },
    { value: "6", label: "Family emergency" },
  ];

  export const NO_SHOW_REASONS_LEARNER = [
    { value: "21", label: "Instructor forgot the booking" },
    { value: "22", label: "Instructor said they were sick" },
    { value: "23", label: "Instructor was not at the pickup location" },
    { value: "24", label: "Incorrect pickup address provided" },
    { value: "25", label: "Family emergency" },
  ];

  export const reasonLearnerMap = new Map(
    NO_SHOW_REASONS_LEARNER.map(item => [item.value, item.label])
  );

  export const reasonInstructorMap = new Map(
    NO_SHOW_REASONS.map(item => [item.value, item.label])
  );
  