export const validatePhoneNumber = (phone: string): boolean => {
  return /^\d{8}$/.test(phone);
};

export const validatePin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

export const validateName = (name: string): boolean => {
  return name.trim().length > 0;
};

export const validatePrice = (price: string): boolean => {
  const num = parseFloat(price);
  return !isNaN(num) && num > 0;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};