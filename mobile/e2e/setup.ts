import { device, element, by, expect } from 'detox';

// Global test setup
beforeAll(async () => {
  await device.launchApp({ newInstance: true, delete: true });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// Helper functions
export const waitForElement = async (testID: string, timeout = 10000) => {
  await waitFor(element(by.id(testID))).toBeVisible().withTimeout(timeout);
  return element(by.id(testID));
};

export const tapElement = async (testID: string) => {
  const el = await waitForElement(testID);
  await el.tap();
  return el;
};

export const typeText = async (testID: string, text: string) => {
  const el = await waitForElement(testID);
  await el.clearText();
  await el.typeText(text);
  return el;
};

export const swipe = async (testID: string, direction: 'left' | 'right' | 'up' | 'down', percentage = 0.8) => {
  const el = await waitForElement(testID);
  await el.swipe(direction, 'fast', percentage);
};

export const pullToRefresh = async (testID: string) => {
  const el = await waitForElement(testID);
  await el.swipe('down', 'fast', 0.5);
};

// Login credentials for testing
export const TEST_USER = {
  email: 'test@entregafacil.app',
  password: 'Teste@123',
  name: 'Motorista Teste',
  phone: '5511999999999',
};

export const TEST_ROUTE = {
  name: 'Rota Teste E2E',
  addresses: [
    { name: 'Endereço 1', address: 'Av. Paulista, 1000 - São Paulo/SP' },
    { name: 'Endereço 2', address: 'Rua Augusta, 500 - São Paulo/SP' },
    { name: 'Endereço 3', address: 'Av. Faria Lima, 2000 - São Paulo/SP' },
  ],
};

// Cleanup
afterAll(async () => {
  await device.terminateApp();
});