import { device, element, by, expect } from 'detox';
import { waitForElement, tapElement, typeText, TEST_USER, TEST_ROUTE } from './setup';

describe('Delivery Proof Flow', () => {
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

  it('should capture proof photo', async () => {
    // Navigate to an active route's waypoint
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    // Start route if not started
    const status = await element(by.id('route-status')).getText();
    if (status !== 'Em Andamento') {
      await tapElement('start-route-button');
      await waitForElement('in-progress-badge');
    }
    
    // Tap first waypoint
    await tapElement(`waypoint-${TEST_ROUTE.addresses[0].name}`);
    await waitForElement('proof-screen');
    
    // Camera should be visible
    await expect(element(by.id('camera-preview'))).toBeVisible();
    
    // Capture photo
    await tapElement('capture-button');
    await tapElement('use-photo-button');
    
    // Photo preview should show
    await waitForElement('photo-preview');
    await expect(element(by.id('photo-preview'))).toBeVisible();
  });

  it('should validate photo with GPS', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    await tapElement(`waypoint-${TEST_ROUTE.addresses[1].name}`);
    await waitForElement('proof-screen');
    
    await tapElement('capture-button');
    await tapElement('use-photo-button');
    
    // Wait for validation
    await waitForElement('validation-complete', 10000);
    await expect(element(by.id('validation-status'))).toHaveText('Foto válida ✓');
  });

  it('should add signature', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    await tapElement(`waypoint-${TEST_ROUTE.addresses[2].name}`);
    await waitForElement('proof-screen');
    
    await tapElement('capture-button');
    await tapElement('use-photo-button');
    
    await waitForElement('validation-complete', 10000);
    
    // Add signature
    await tapElement('show-signature-button');
    await waitForElement('signature-canvas');
    
    // Draw signature (simulate swipe)
    await element(by.id('signature-canvas')).swipe('right', 'fast', 0.8);
    await element(by.id('signature-canvas')).swipe('left', 'fast', 0.4);
    
    await tapElement('save-signature-button');
    
    // Signature should be saved
    await expect(element(by.id('signature-preview'))).toBeVisible();
  });

  it('should confirm delivery with photo and signature', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    await tapElement(`waypoint-${TEST_ROUTE.addresses[0].name}`);
    await waitForElement('proof-screen');
    
    await tapElement('capture-button');
    await tapElement('use-photo-button');
    
    await waitForElement('validation-complete', 10000);
    
    await tapElement('show-signature-button');
    await waitForElement('signature-canvas');
    await element(by.id('signature-canvas')).swipe('right', 'fast', 0.8);
    await tapElement('save-signature-button');
    
    // Confirm delivery
    await tapElement('confirm-delivery-button');
    
    // Success modal
    await waitForElement('success-modal');
    await expect(element(by.id('success-message'))).toHaveText('Entrega confirmada com sucesso!');
    
    await tapElement('success-ok-button');
    
    // Should be back to checklist with waypoint marked delivered
    await waitForElement('route-checklist');
    await expect(element(by.id(`waypoint-${TEST_ROUTE.addresses[0].name}-status`))).toHaveText('Entregue');
  });

  it('should register problem (client absent)', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    await tapElement(`waypoint-${TEST_ROUTE.addresses[1].name}`);
    await waitForElement('proof-screen');
    
    await tapElement('capture-button');
    await tapElement('use-photo-button');
    
    await waitForElement('validation-complete', 10000);
    
    // Select problem type
    await tapElement('problem-cliente_ausente');
    
    // Add observation
    await typeText('problem-observation', 'Cliente não atendeu após 3 tentativas');
    
    // Register problem
    await tapElement('register-problem-button');
    
    // Success modal
    await waitForElement('success-modal');
    await expect(element(by.id('success-message'))).toHaveText('Problema registrado com sucesso!');
    
    await tapElement('success-ok-button');
    
    // Should be back to checklist with waypoint marked as problem
    await waitForElement('route-checklist');
    await expect(element(by.id(`waypoint-${TEST_ROUTE.addresses[1].name}-status`))).toHaveText('Problema');
  });

  it('should send WhatsApp notification on delivery', async () => {
    // This test assumes WhatsApp is configured
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    await tapElement(`route-${TEST_ROUTE.name}`);
    await waitForElement('route-checklist');
    
    await tapElement(`waypoint-${TEST_ROUTE.addresses[2].name}`);
    await waitForElement('proof-screen');
    
    await tapElement('capture-button');
    await tapElement('use-photo-button');
    
    await waitForElement('validation-complete', 10000);
    
    // Check WhatsApp status indicator
    await waitForElement('whatsapp-status');
    
    // Confirm delivery
    await tapElement('confirm-delivery-button');
    
    // WhatsApp status should update
    await waitForElement('whatsapp-sent-status', 10000);
    await expect(element(by.id('whatsapp-status-text'))).toHaveText('Enviado ✓');
  });
});