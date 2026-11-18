'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, CheckBox, Modal, TextInput, Button, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRoutes, useAddresses } from '@/shared/hooks';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

export default function NewRouteScreen() {
  const { addresses, loading: addressesLoading, fetchAddresses } = useAddresses();
  const { createRoute, loading } = useRoutes();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [routeName, setRouteName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    fetchAddresses();
    loadVehicles();
  }, [fetchAddresses]);

  const loadVehicles = async () => {
    try {
      // TODO: Fetch vehicles from API
      // For now, mock data
      setVehicles([
        { id: '1', placa: 'ABC1D23', modelo: 'Honda CG 160', tipo: 'moto' },
      ]);
      if (vehicles.length > 0) setSelectedVehicleId(vehicles[0].id);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  const toggleAddress = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCreateRoute = async () => {
    if (selectedIds.length < 2) {
      Alert.alert('Erro', 'Selecione pelo menos 2 endereços');
      return;
    }
    if (!routeName.trim()) {
      setShowNameModal(true);
      return;
    }
    if (!selectedVehicleId) {
      Alert.alert('Erro', 'Selecione um veículo');
      return;
    }

    try {
      await createRoute({
        nome: routeName,
        data: new Date().toISOString().split('T')[0],
        veiculoId: selectedVehicleId,
        waypoints: selectedIds.map((id, index) => ({
          id: crypto.randomUUID(),
          enderecoId: id,
          ordem: index,
          status: 'pendente',
        })),
      });
      Alert.alert('Sucesso', 'Rota criada com sucesso!');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao criar rota');
    }
  };

  const renderAddress = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.addressRow} onPress={() => toggleAddress(item.id)}>
      <CheckBox
        value={selectedIds.includes(item.id)}
        onValueChange={() => toggleAddress(item.id)}
        color="#0066CC"
      />
      <View style={styles.addressInfo} flex={1}>
        <Text style={styles.addressName}>{item.nome}</Text>
        <Text style={styles.addressDetail}>{item.enderecoFormatado}</Text>
      </View>
      <View style={styles.addressOrder}>
        <Text style={styles.orderNumber}>{selectedIds.indexOf(item.id) + 1}</Text>
      </View>
    </TouchableOpacity>
  );

  if (addressesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando endereços...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#0066CC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova Rota</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações da Rota</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Rota</Text>
            <TextInput
              style={styles.input}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Ex: Rota Centro - 17/11"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Veículo</Text>
            <TouchableOpacity style={styles.vehicleSelector} onPress={() => setShowVehicleModal(true)}>
              <View style={styles.vehicleSelectorContent}>
                <Text style={vehicles.find(v => v.id === selectedVehicleId) ? styles.vehicleText : styles.vehiclePlaceholder}>
                  {vehicles.find(v => v.id === selectedVehicleId) 
                    ? `${vehicles.find(v => v.id === selectedVehicleId)!.placa} - ${vehicles.find(v => v.id === selectedVehicleId)!.modelo}`
                    : 'Selecione um veículo'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Endereços ({selectedIds.length} selecionados)</Text>
            <Text style={styles.sectionSubtitle}>Toque para selecionar/desselecionar</Text>
          </View>
          <FlatList
            data={addresses}
            renderItem={renderAddress}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Nenhum endereço cadastrado</Text>
                <TouchableOpacity style={styles.addAddressButton} onPress={() => router.push('/addresses/new')}>
                  <Text style={styles.addAddressButtonText}>Adicionar primeiro endereço</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        <View style={styles.createButtonContainer}>
          <Button
            title={loading ? 'Criando...' : `Criar Rota (${selectedIds.length} endereços)`}
            onPress={handleCreateRoute}
            disabled={loading || selectedIds.length < 2}
            color="#0066CC"
            style={styles.createButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Imports
import { router } from 'expo-router';
import { crypto } from 'crypto';