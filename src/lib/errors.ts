export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class MondayAPIError extends AppError {
  constructor(message: string) {
    super(message, "MONDAY_API_ERROR", 502);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Not authenticated") {
    super(message, "AUTH_ERROR", 401);
  }
}
