/**
 * BeOn V3 OTP Service
 * خدمة إرسال رموز التحقق لمرة واحدة عبر BeOn V3
 */
import { BEON_V3_CONFIG, BeOnResponse, createBeOnHeaders } from './config';

interface OTPRequest {
  phoneNumbers: string[];
  sender?: string;
  lang?: string;
  otp_length?: number;
}

export class BeOnOTPService {
  private baseUrl: string;
  private token: string;
  private otpSendEndpoint: string;

  constructor() {
    this.baseUrl = BEON_V3_CONFIG.BASE_URL;
    this.token = BEON_V3_CONFIG.TOKEN;
    this.otpSendEndpoint = BEON_V3_CONFIG.ENDPOINTS.OTP_SEND;
  }

  /**
   * Sends an OTP via the dedicated BeOn V3 OTP endpoint.
   * @param phoneNumber The full phone number including country code (e.g., +201234567890)
   * @param otpLength The desired length of the OTP code.
   * @returns A BeOnResponse indicating success or failure.
   */
  async sendOTP(phoneNumber: string, otpLength: number = 6): Promise<BeOnResponse> {
    const url = `${this.baseUrl}${this.otpSendEndpoint}`;

    console.log(`📱 Sending OTP to ${phoneNumber} via endpoint: ${url}`);

    const requestBody: OTPRequest = {
      phoneNumbers: [phoneNumber.replace(/^\+/, '')], // API expects number without '+'
      sender: BEON_V3_CONFIG.DEFAULTS.SENDER_NAME,
      lang: BEON_V3_CONFIG.DEFAULTS.LANGUAGE,
      otp_length: otpLength,
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
        console.log(`✅ [BeOnOTPService] OTP sent successfully. Reference: ${responseData.reference}`);
        return {
          success: true,
          message: 'OTP sent successfully.',
          data: responseData, // Forward the full response data
        };
      } else {
        console.error(`❌ [BeOnOTPService] Failed to send OTP. Response:`, responseData);
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


















