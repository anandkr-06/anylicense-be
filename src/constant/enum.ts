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
    FLEXIBLE = 'Flexible',

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