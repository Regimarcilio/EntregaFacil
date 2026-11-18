import { device, element, by, expect } from 'detox';
import { waitForElement, tapElement, typeText, swipe, TEST_USER, TEST_ROUTE } from './setup';

describe('Addresses Management', () => {
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

  it('should navigate to addresses tab', async () => {
    // Addresses are in rotas tab or separate - navigate via routes
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
  });

  it('should create new address', async () => {
    await tapElement('tab-rotas');
    await waitForElement('routes-screen');
    
    // Navigate to addresses (assuming there's a way to access addresses)
    // For now, let's test via route creation which includes address selection
    await tapElement('new-route-button');
    await waitForElement('new-route-screen');
    
    // Add address
    await tapElement('add-address-button');
    await waitForElement('address-search');
    
    await typeText('address-search', TEST_ROUTE.addresses[0].address);
    await tapElement('address-result-0');
    
    // Fill address details
    await typeText('address-name', TEST_ROUTE.addresses[0].name);
    await tapElement('save-address-button');
    
    // Should be back to route creation with address added
    await waitForElement('new-route-screen');
    await expect(element(by.text(TEST_ROUTE.addresses[0].name))).toBeVisible();
  });

  it('should list saved addresses', async () => {
    // Navigate to addresses list
    await tapElement('addresses-tab');
    await waitForElement('addresses-list');
    
    // Should show previously saved addresses
    await expect(element(by.text(TEST_ROUTE.addresses[0].name))).toBeVisible();
  });

  it('should edit address', async () => {
    await tapElement('addresses-tab');
    await waitForElement('addresses-list');
    
    // Swipe to edit
    await swipe(`address-${TEST_ROUTE.addresses[0].name}`, 'left');
    await tapElement('edit-address-button');
    
    await waitForElement('edit-address-screen');
    await typeText('address-name', 'Endereço 1 Editado');
    await tapElement('save-address-button');
    
    await waitForElement('addresses-list');
    await expect(element(by.text('Endereço 1 Editado'))).toBeVisible();
  });

  it('should delete address', async () => {
    await tapElement('addresses-tab');
    await waitForElement('addresses-list');
    
    // Swipe to delete
    await swipe(`address-${TEST_ROUTE.addresses[1].name}`, 'left');
    await tapElement('delete-address-button');
    
    // Confirm deletion
    await tapElement('confirm-delete');
    
    await waitForElement('addresses-list');
    await expect(element(by.text(TEST_ROUTE.addresses[1].name))).not.toBeVisible();
  });

  it('should import addresses from CSV', async () => {
    await tapElement('addresses-tab');
    await waitForElement('addresses-list');
    
    await tapElement('import-csv-button');
    await waitForElement('csv-import-screen');
    
    // Would need to simulate file selection
    // For now, test the UI flow
    await expect(element(by.id('csv-file-input'))).toBeVisible();
    await tapElement('cancel-import');
  });
});