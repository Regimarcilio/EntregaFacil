import { device, element, by, expect } from 'detox';
import { waitForElement, tapElement, typeText, swipe, TEST_USER, TEST_ROUTE } from './setup';

describe('Routes Management', () => {
  beforeAll(async () => {
    // Login first
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

  it('should create new route', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement('new-route-button');
    await waitForElement('new-route-screen');
    
    // Add route name
    await typeText('route-name', TEST_ROUTE.name);
    
    // Add addresses (assuming they exist from addresses test)
    for (const addr of TEST_ROUTE.addresses) {
      await tapElement('add-waypoint-button');
      await waitForElement('address-search');
      await typeText('address-search', addr.address);
      await tapElement('address-result-0');
    }
    
    // Save route
    await tapElement('save-route-button');
    
    // Should be back to routes list
    await waitForElement('routes-screen');
    await expect(element(by.text(TEST_ROUTE.name))).toBeVisible();
  });

  it('should optimize route', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    // Find and tap the test route
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    // Optimize
    await tapElement('optimize-route-button');
    
    // Wait for optimization
    await waitForElement('optimized-badge', 15000);
    await expect(element(by.id('optimized-badge'))).toHaveText('Otimizada');
  });

  it('should start route', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    await tapElement('start-route-button');
    await waitForElement('in-progress-badge');
    await expect(element(by.id('in-progress-badge'))).toHaveText('Em Andamento');
  });

  it('should navigate route checklist', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    // Should show waypoints
    for (const addr of TEST_ROUTE.addresses) {
      await expect(element(by.text(addr.name))).toBeVisible();
    }
    
    // Reorder waypoints (drag and drop)
    await swipe(`waypoint-${TEST_ROUTE.addresses[0].name}`, 'up');
    // Would need more complex drag-drop simulation
  });

  it('should show route on map', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    await tapElement('map-tab');
    await waitForElement('route-map');
    
    // Map should be visible with route line
    await expect(element(by.id('map-view'))).toBeVisible();
  });

  it('should finish route', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    // Complete all waypoints first (simplified)
    for (const addr of TEST_ROUTE.addresses) {
      await tapElement(`waypoint-${addr.name}`);
      await waitForElement('proof-screen');
      
      // Take photo (mock)
      await tapElement('capture-photo-button');
      await tapElement('use-photo-button');
      
      // Confirm delivery
      await tapElement('confirm-delivery-button');
      await waitForElement('route-checklist');
    }
    
    // Finish route
    await tapElement('finish-route-button');
    await waitForElement('completed-badge');
    await expect(element(by.id('completed-badge'))).toHaveText('Concluída');
  });
});