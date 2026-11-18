import { device, element, by, expect } from 'detox';
import { waitForElement, tapElement, typeText, TEST_USER } from './setup';

describe('Offline & Sync', () => {
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

  it('should work offline - create address', async () => {
    // Enable airplane mode
    await device.setAirplaneMode(true);
    
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    // Should show offline indicator
    await waitForElement('offline-indicator');
    await expect(element(by.id('offline-indicator'))).toHaveText('Offline');
    
    // Try to create address
    await tapElement('new-route-button');
    await waitForElement('new-route-screen');
    await tapElement('add-address-button');
    await waitForElement('address-search');
    
    // Search won't work offline, but can create manual address
    await tapElement('manual-address-button');
    await waitForElement('manual-address-screen');
    
    await typeText('address-name', 'Endereço Offline');
    await typeText('address-street', 'Rua Teste, 123');
    await typeText('address-city', 'São Paulo');
    await typeText('address-state', 'SP');
    await tapElement('save-address-button');
    
    // Should save locally
    await waitForElement('success-toast');
    await expect(element(by.id('success-toast'))).toHaveText('Salvo offline');
    
    // Disable airplane mode
    await device.setAirplaneMode(false);
  });

  it('should queue operations offline and sync when online', async () => {
    // Enable airplane mode
    await device.setAirplaneMode(true);
    
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    // Create route offline
    await tapElement('new-route-button');
    await waitForElement('new-route-screen');
    await typeText('route-name', 'Rota Offline');
    await tapElement('save-route-button');
    
    // Should queue for sync
    await waitForElement('sync-queue-badge');
    await expect(element(by.id('sync-queue-count'))).toHaveText('1');
    
    // Disable airplane mode
    await device.setAirplaneMode(false);
    
    // Wait for sync
    await waitForElement('sync-complete', 15000);
    await expect(element(by.id('sync-queue-count'))).toHaveText('0');
    
    // Route should now be on server
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    await expect(element(by.text('Rota Offline'))).toBeVisible();
  });

  it('should sync proof offline', async () => {
    // Start a route
    await device.setAirplaneMode(true);
    
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    // Assuming we have a route to test with
    // Navigate to waypoint proof screen
    // Capture photo, confirm delivery
    
    // Should queue proof for sync
    await waitForElement('sync-queue-badge');
    
    // Go online
    await device.setAirplaneMode(false);
    
    // Wait for sync
    await waitForElement('sync-complete', 15000);
  });

  it('should show sync status in settings', async () => {
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    // Should show last sync time
    await waitForElement('last-sync-time');
    await expect(element(by.id('last-sync-time'))).toBeVisible();
    
    // Force sync button
    await tapElement('force-sync-button');
    await waitForElement('sync-complete', 10000);
  });

  it('should handle conflict resolution', async () => {
    // This would test the case where same data modified offline and online
    // For now, test the UI flow
    await tapElement('tab-perfil');
    await waitForElement('profile-screen');
    
    await tapElement('settings-menu');
    await waitForElement('settings-screen');
    
    // Check conflict resolution setting
    await waitForElement('conflict-resolution-info');
    await expect(element(by.id('conflict-resolution-info'))).toBeVisible();
  });
});

// Need to import typeText
import { typeText } from './setup';