import { device, element, by, expect } from 'detox';
import { waitForElement, tapElement, typeText, TEST_USER } from './setup';

describe('Settings & Preferences', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitForElement('login-screen');
    await typeText('email-input', TEST_USER.email);
    await typeText('password-input', TEST_USER.password);
    await tapElement('login-button');
    await waitForElement('tab-bar');
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitForElement('tab-bar');
  });

  it('should change theme', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    // Change to dark theme
    await tapElement('theme-escuro');
    await expect(element(by.id('theme-escuro'))).toHaveStyle({ backgroundColor: '#0066CC' });
    
    // Change to light theme
    await tapElement('theme-claro');
    await expect(element(by.id('theme-claro'))).toHaveStyle({ backgroundColor: '#0066CC' });
    
    // Back to system
    await tapElement('theme-sistema');
  });

  it('should toggle voice navigation', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    // Toggle voice navigation off
    await tapElement('voice-navigation-toggle');
    await expect(element(by.id('voice-navigation-toggle'))).not.toBeChecked();
    
    // Toggle back on
    await tapElement('voice-navigation-toggle');
    await expect(element(by.id('voice-navigation-toggle'))).toBeChecked();
  });

  it('should adjust voice volume', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    // Adjust slider
    await element(by.id('voice-volume-slider')).swipe('right', 'fast', 0.5);
    await expect(element(by.id('voice-volume-value'))).toHaveText('50%');
  });

  it('should toggle glove mode', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('glove-mode-toggle');
    await expect(element(by.id('glove-mode-toggle'))).toBeChecked();
  });

  it('should toggle auto-start navigation', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('auto-start-toggle');
    await expect(element(by.id('auto-start-toggle'))).not.toBeChecked();
  });

  it('should toggle WiFi-only sync', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('wifi-only-toggle');
    await expect(element(by.id('wifi-only-toggle'))).not.toBeChecked();
  });

  it('should toggle push notifications', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('push-notifications-toggle');
    await expect(element(by.id('push-notifications-toggle'))).not.toBeChecked();
    
    // Re-enable
    await tapElement('push-notifications-toggle');
    await expect(element(by.id('push-notifications-toggle'))).toBeChecked();
  });

  it('should clear cache', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('clear-cache-button');
    await tapElement('confirm-clear-cache');
    
    await waitForElement('cache-cleared-toast');
    await expect(element(by.id('cache-cleared-toast'))).toHaveText('Cache limpo com sucesso');
  });

  it('should reset preferences', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('reset-preferences-button');
    await tapElement('confirm-reset-preferences');
    
    await waitForElement('preferences-reset-toast');
    await expect(element(by.id('preferences-reset-toast'))).toHaveText('Preferências restauradas');
  });

  it('should navigate to WhatsApp settings', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('whatsapp-settings-item');
    await waitForElement('whatsapp-settings-screen');
    await expect(element(by.id('whatsapp-settings-title'))).toHaveText('WhatsApp');
  });

  it('should navigate to offline maps', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('offline-maps-item');
    await waitForElement('offline-maps-screen');
    await expect(element(by.id('offline-maps-title'))).toHaveText('Mapas Offline');
  });

  it('should show app version', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await expect(element(by.id('app-version'))).toHaveText('Versão 1.0.0');
    await expect(element(by.id('app-build'))).toHaveText('Build 1');
  });

  it('should show about modal', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    await tapElement('about-item');
    await waitForElement('about-modal');
    await expect(element(by.id('about-title'))).toHaveText('Sobre o EntregaFácil');
    
    await tapElement('close-about-modal');
    await expect(element(by.id('about-modal'))).not.toBeVisible();
  });
});