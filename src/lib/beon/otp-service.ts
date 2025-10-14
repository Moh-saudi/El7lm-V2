/**
 * BeOn V3 OTP Service
 * خدمة إرسال رموز التحقق لمرة واحدة عبر BeOn V3
 */
import { BEON_V3_CONFIG, createBeOnHeaders, BeOnResponse } from './config';

// Interface for the OTP request body, which might differ from bulk SMS
interface OTPRequest {
  phoneNumbers: string[];
  sender?: string;
  lang?: string;
  otp_length?: number;
  type?: 'sms' | 'whatsapp'; // To specify the channel
}

export class BeOnOTPService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = BEON_V3_CONFIG.BASE_URL;
    this.token = BEON_V3_CONFIG.TOKEN;
  }

  /**
   * Sends an OTP, automatically selecting the channel (SMS/WhatsApp) based on the phone number.
   * @param phoneNumber The full phone number including country code (e.g., +201234567890)
   * @param otpLength The desired length of the OTP code.
   * @returns A BeOnResponse indicating success or failure.
   */
  async sendOTP(phoneNumber: string, otpLength: number = 6): Promise<BeOnResponse> {
    const isEgypt = phoneNumber.startsWith('+20');
    const channel = isEgypt ? 'sms' : 'whatsapp';
    
    // Note: The admin panel and config suggest V3 sends WhatsApp as SMS.
    // We will still pass the 'whatsapp' type in case their API handles it differently for OTPs.
    // The endpoint itself might be the same.
    const endpoint = '/api/v3/send/otp'; // Dedicated OTP endpoint seems more appropriate
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`📱 Sending OTP via ${channel} to ${phoneNumber}`);

    const requestBody: OTPRequest = {
      phoneNumbers: [phoneNumber.replace(/^\+/, '')],
      sender: BEON_V3_CONFIG.DEFAULTS.SENDER_NAME,
      lang: BEON_V3_CONFIG.DEFAULTS.LANGUAGE,
      otp_length: otpLength,
      type: channel,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: createBeOnHeaders(this.token),
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error(`❌ [BeOnOTPService] Failed to parse JSON response from BeOn. Status: ${response.status}. Response:`, responseText);
        return { success: false, error: 'Invalid response from OTP provider.' };
      }

      if (response.ok && (responseData.success || responseData.status === 'success')) {
        console.log(`✅ [BeOnOTPService] OTP sent successfully via ${channel}.`);
        return {
          success: true,
          message: 'OTP sent successfully.',
          data: responseData,
        };
      } else {
        console.error(`❌ [BeOnOTPService] Failed to send OTP via ${channel}. Response:`, responseData);
        return {
          success: false,
          error: responseData.error || responseData.message || 'Failed to send OTP.',
          data: responseData,
        };
      }
    } catch (error) {
      console.error('❌ [BeOnOTPService] Network or fetch error:', error);
      return {
        success: false,
        error: 'A network error occurred while trying to send the OTP.',
        data: error,
      };
    }
  }
}

// Export a singleton instance for easy use across the application
export const beonOTPService = new BeOnOTPService();


















