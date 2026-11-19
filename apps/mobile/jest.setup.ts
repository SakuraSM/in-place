import { act } from '@testing-library/react-native';
import { notifyManager } from '@tanstack/react-query';

// Query notifications are scheduled outside React event handlers.
notifyManager.setNotifyFunction((notify) => {
  act(notify);
});

jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));
