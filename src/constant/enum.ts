export enum FeedbackOwnerType {
  LEARNER = 'learner',
  INSTRUCTOR = 'instructor',
}

export enum FeedbackType {
    COMMENTS = 'COMMENTS',
    SUGGESTIONS = 'SUGGESTIONS',
    QUESTIONS = 'QUESTIONS',
  }
  
  export enum courseCategory {
    TRUCK = 'TRUCK',
    BIKE = 'BIKE',
    DANGEROUS_GOODS = 'DANGEROUS GOODS',
    FORK_LIFT = 'FORK LIFT',
  }

  export enum courseType {
    WEEKEND = 'Weekend',
    WEEKDAY = 'Weekday',
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
  