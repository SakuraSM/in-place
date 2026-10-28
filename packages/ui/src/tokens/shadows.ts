// Shadow tokens — Web format (CSS box-shadow value)
export const shadowsWeb = {
  sm: '0 0 0 0 transparent',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  card: '0 8px 28px rgba(36, 59, 51, 0.035)',
  picker: '0 18px 40px rgba(15, 23, 42, 0.14)',
  logo: '0 14px 28px rgba(15, 23, 42, 0.08)',
} as const;

// Shadow tokens — Mobile format (React Native ViewStyle)
export const shadowsMobile = {
  sm: {
    shadowColor: '#243b33',
    shadowOpacity: 0,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },
  md: {
    shadowColor: '#243b33',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -1 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#243b33',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -3 },
    elevation: 5,
  },
  card: {
    shadowColor: '#243b33',
    shadowOpacity: 0.035,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  logo: {
    shadowColor: '#243b33',
    shadowOpacity: 0.035,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
} as const;
