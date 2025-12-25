export const mockLoginResponse = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: {
    accessToken: 'access.token.token',
  },
};

export const mockForgetPasswordResponse = {
  status: 200,
  success: true,
  message: 'Password reset link generated',
  data: {
    resetToken: 'reset.token.reset',
  },
};

export const mockResetPasswordResponse = {
  status: 200,
  success: true,
  message: 'Request successful',
};

export const mockLogoutResponse = {
  status: 200,
  success: true,
  message: 'Logout successful',
};
