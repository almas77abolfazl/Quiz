import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Development delivery deliberately never returns the OTP to an HTTP client.
 * Replace this adapter with the production SMS provider before public release.
 */
@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, code: string): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new Error('No production SMS provider is configured');
    }

    this.logger.log(`Development OTP generated for ${phone}: ${code}`);
  }
}
