// Connection handler - migrated from Firebase to generic retry logic

export class ConnectionHandler {
  private static retryAttempts = 0;
  private static maxRetries = 3;
  private static retryDelay = 1000;

  static async handleError(error: Error, operation: () => Promise<any>): Promise<any> {
    console.log('Connection Error:', error.message);

    if (this.isConnectionError(error)) {
      return this.handleConnectionError(error, operation);
    }

    throw error;
  }

  // Alias for backward compatibility
  static async handleFirebaseError(error: any, operation: () => Promise<any>): Promise<any> {
    return this.handleError(error instanceof Error ? error : new Error(String(error)), operation);
  }

  private static isConnectionError(error: Error): boolean {
    const msg = error.message || '';
    return (
      msg.includes('unavailable') ||
      msg.includes('failed-precondition') ||
      msg.includes('deadline-exceeded') ||
      msg.includes('offline') ||
      msg.includes('network') ||
      msg.includes('NetworkError') ||
      msg.includes('Failed to fetch')
    );
  }

  private static async handleConnectionError(error: Error, operation: () => Promise<any>): Promise<any> {
    if (this.retryAttempts >= this.maxRetries) {
      console.error('تم تجاوز محاولات إعادة المحاولة:', error.message);
      this.retryAttempts = 0;
      throw new Error('فشل الاتصال مع قاعدة البيانات. يرجى التحقق من اتصال الإنترنت.');
    }

    console.log(`إعادة المحاولة ${this.retryAttempts + 1} من ${this.maxRetries}...`);
    this.retryAttempts++;

    await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.retryAttempts));

    try {
      const result = await operation();
      this.retryAttempts = 0;
      return result;
    } catch (retryError) {
      if (retryError instanceof Error) {
        return this.handleError(retryError, operation);
      }
      throw retryError;
    }
  }

  static resetRetryCounter() {
    this.retryAttempts = 0;
  }
}

// Backward compatibility alias
export const FirebaseConnectionHandler = ConnectionHandler;

export async function executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    return ConnectionHandler.handleFirebaseError(error, operation);
  }
}
