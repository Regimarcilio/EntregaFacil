import { device, element, by, expect } from 'detox';
import { waitForElement, tapElement, typeText, TEST_USER } from './setup';

describe('Authentication Flow', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it('should show login screen on app start', async () => {
    await waitForElement('login-screen');
    await expect(element(by.id('login-title'))).toHaveText('Entrar');
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should login successfully with valid credentials', async () => {
    await waitForElement('login-screen');
    
    await typeText('email-input', TEST_USER.email);
    await typeText('password-input', TEST_USER.password);
    await tapElement('login-button');
    
    // Should navigate to main tabs
    await waitForElement('tab-bar');
    await expect(element(by.id('tab-rotas'))).toBeVisible();
    await expect(element(by.id('tab-historico'))).toBeVisible();
    await expect(element(by.id('tab-mapa'))).toBeVisible();
    await expect(element(by.id('tab-perfil'))).toBeVisible();
  });

  it('should show error with invalid credentials', async () => {
    await waitForElement('login-screen');
    
    await typeText('email-input', 'invalid@email.com');
    await typeText('password-input', 'wrongpassword');
    await tapElement('login-button');
    
    // Should show error message
    await waitForElement('error-message');
    await expect(element(by.id('error-message'))).toHaveText('Credenciais inválidas');
  });

  it('should navigate to register screen', async () => {
    await waitForElement('login-screen');
    await tapElement('register-link');
    
    await waitForElement('register-screen');
    await expect(element(by.id('register-title'))).toHaveText('Criar Conta');
  });

  it('should logout successfully', async () => {
    // First login
    await waitForElement('login-screen');
    await typeText('email-input', TEST_USER.email);
    await typeText('password-input', TEST_USER.password);
    await tapElement('login-button');
    
    await waitForElement('tab-bar');
    
    // Go to profile and logout
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('logout-button');
    
    // Confirm logout
    await tapElement('confirm-logout');
    
    // Should be back at login
    await waitForElement('login-screen');
  });
});