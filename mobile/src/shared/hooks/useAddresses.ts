import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { Endereco } from '../store';

export function useAddresses() {
  const { addresses, setAddresses, addAddress, updateAddress, removeAddress } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setAddresses]);

  const refreshAddresses = useCallback(async () => {
    setRefreshing(true);
    await fetchAddresses();
  }, [fetchAddresses]);

  const createAddress = useCallback(async (data: Partial<Endereco>) => {
    try {
      const newAddress = await apiClient.createAddress(data);
      addAddress(newAddress);
      return newAddress;
    } catch (error) {
      console.error('Failed to create address:', error);
      throw error;
    }
  }, [addAddress]);

  const updateAddressData = useCallback(async (id: string, data: Partial<Endereco>) => {
    try {
      const updated = await apiClient.updateAddress(id, data);
      updateAddress(id, updated);
      return updated;
    } catch (error) {
      console.error('Failed to update address:', error);
      throw error;
    }
  }, [updateAddress]);

  const deleteAddress = useCallback(async (id: string) => {
    try {
      await apiClient.deleteAddress(id);
      removeAddress(id);
    } catch (error) {
      console.error('Failed to delete address:', error);
      throw error;
    }
  }, [removeAddress]);

  const geocode = useCallback(async (query: string) => {
    try {
      return await apiClient.geocodeAddress(query);
    } catch (error) {
      console.error('Geocoding failed:', error);
      return [];
    }
  }, []);

  const importCSV = useCallback(async (csvContent: string) => {
    // TODO: Implement CSV parsing and batch create
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const results = { success: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const addressData: Partial<Endereco> = {};
      headers.forEach((header, index) => {
        addressData[header as keyof Endereco] = values[index];
      });

      try {
        await createAddress(addressData);
        results.success++;
      } catch (error) {
        results.errors.push(`Linha ${i + 1}: ${error}`);
      }
    }

    return results;
  }, [createAddress]);

  return {
    addresses,
    loading,
    refreshing,
    fetchAddresses,
    refreshAddresses,
    createAddress,
    updateAddress: updateAddressData,
    deleteAddress,
    geocode,
    importCSV,
  };
}