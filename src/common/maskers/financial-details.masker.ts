// src/common/maskers/financial-details.masker.ts
import { MaskUtil } from '../../utils/mask.util'

export function maskFinancialDetails(financialDetails: any) {
  if (!financialDetails) return financialDetails;

  return {
    ...financialDetails,
    accountHolderName: MaskUtil.maskName(financialDetails.accountHolderName),
    accountNumber: MaskUtil.maskAccountNumber(financialDetails.accountNumber),
    bsbNumber: MaskUtil.maskGeneric(financialDetails.bsbNumber),
    abnNumber: MaskUtil.maskGeneric(financialDetails.abnNumber),
    bankName: financialDetails.bankName, // usually ok to show
    businessName: financialDetails.businessName,
  };
}