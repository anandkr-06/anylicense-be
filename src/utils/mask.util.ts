// src/common/utils/mask.util.ts
export class MaskUtil {
    static maskAccountNumber(value?: string | null): string | null {
      if (value == null) return null; // handles null + undefined
      return value.slice(0, 2) + 'XXXXXX' + value.slice(-2);
    }
  
    static maskName(value?: string | null): string | null {
      if (value == null) return null;
      return value[0] + '****';
    }
  
    static maskGeneric(value?: string | null): string | null {
      if (value == null) return null;
      return '****';
    }
  }