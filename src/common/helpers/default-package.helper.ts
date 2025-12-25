import { TransmissionType } from '@constant/packages';
import { Types } from 'mongoose';

// eslint-disable-next-line max-lines-per-function
export const createDefaultPackagesForInstructor = (
  instructorId: Types.ObjectId,
  transmissionType: TransmissionType,
) => {
  const systemAutoPackage = [
    {
      userId: instructorId,
      name: 'Any Licence Lessons (per/hour)',
      type: 'anylicense_auto_package',
      transmissionType: TransmissionType.AUTO,
      durationInHours: 1,
      description: 'Learner pay $83.70-$93/hr',
      minAmount: 83.7,
      maxAmount: 93,
      amount: 90,
      isEditable: false,
    },
    {
      userId: instructorId,
      name: 'Any Licence Test Package',
      type: 'anylicense_auto_test_package',
      transmissionType: TransmissionType.AUTO,
      description: 'Learner pay $210-$235/hr',
      durationInHours: 2.5,
      minAmount: 210,
      maxAmount: 235,
      amount: 227,
      isEditable: false,
    },
  ];

  const systemManualPackage = [
    {
      userId: instructorId,
      name: 'Any Licence Lessons (per/hour)',
      type: 'anylicense_manual_package',
      description: 'Learner pay $83.70-$93/hr',
      transmissionType: TransmissionType.MANUAL,
      durationInHours: 1,
      amount: 95,
      minAmount: 88,
      maxAmount: 98,
      isEditable: false,
    },
    {
      userId: instructorId,
      name: 'Any Licence Test Package',
      type: 'anylicense_manual_test_package',
      description: 'Learner pay $243-$273/hr',
      transmissionType: TransmissionType.MANUAL,
      durationInHours: 2.5,
      minAmount: 243,
      maxAmount: 273,
      amount: 250,
      isEditable: false,
    },
  ];

  const instructorAutoPakcage = [
    {
      userId: instructorId,
      name: 'Private Lessons (per/hour)',
      type: 'private_auto_package',
      durationInHours: 1,
      description: 'Learner pay $83.70-$93/hr',
      transmissionType: TransmissionType.AUTO,
      amount: 95,
      minAmount: 88,
      maxAmount: 98,
      isEditable: true,
    },
    {
      userId: instructorId,
      name: 'Private Test Package',
      transmissionType: TransmissionType.AUTO,
      type: 'private_auto_test_package',
      description: 'Learner pay $230-$260/hr',
      amount: 250,
      durationInHours: 2.5,
      isEditable: true,
      minAmount: 230,
      maxAmount: 260,
    },
  ];

  const instructorManualPakcage = [
    {
      userId: instructorId,
      name: 'Private Manual Lessons (per/hour)',
      type: 'private_manual_package',
      durationInHours: 1,
      description: 'Learner pay $83.70-$93/hr',
      transmissionType: TransmissionType.MANUAL,
      amount: 90,
      minAmount: 88,
      maxAmount: 98,
      isEditable: true,
    },
    {
      userId: instructorId,
      name: 'Private Manual Test Package',
      transmissionType: TransmissionType.MANUAL,
      type: 'private_manual_test_package',
      description: 'Learner pay $230-$260/hr',
      amount: 250,
      durationInHours: 2.5,
      isEditable: true,
      minAmount: 230,
      maxAmount: 260,
    },
  ];

  if (transmissionType === TransmissionType.AUTO) {
    return [...systemAutoPackage, ...instructorAutoPakcage];
  } else if (transmissionType === TransmissionType.MANUAL) {
    return [...systemManualPackage, ...instructorManualPakcage];
  } else {
    return [
      ...systemAutoPackage,
      ...systemManualPackage,
      ...instructorAutoPakcage,
      ...instructorManualPakcage,
    ];
  }
};
