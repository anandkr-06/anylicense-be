import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoHelper {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('FINANCIAL_ENCRYPTION_KEY');

    if (!rawKey) {
      throw new Error('FINANCIAL_ENCRYPTION_KEY is missing');
    }

    const key = rawKey.trim();

    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error('FINANCIAL_ENCRYPTION_KEY must be 64 hex characters');
    }
    this.key = Buffer.from(key, 'hex');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(encryptedText: string): string {
    const data = Buffer.from(encryptedText, 'base64');

    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const encrypted = data.subarray(28);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
