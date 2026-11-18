'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, Button, TextInput, Platform, ScrollView } from 'react-native';
import { useAddresses } from '@/shared/hooks/useAddresses';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';

export default function AddressesScreen() {
  const { addresses, loading, refreshing, fetchAddresses, deleteAddress, importCSV } = useAddresses();
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleRefresh = async () => {
    await fetchAddresses();
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Excluir endereço',
      'Tem certeza que deseja excluir este endereço?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteAddress(id) },
      ]
    );
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      Alert.alert('Erro', 'Cole o conteúdo do CSV');
      return;
    }

    setImporting(true);
    try {
      const result = await importCSV(csvText);
      setImportResult(result);
      setCsvText('');
      if (result.created > 0) {
        Alert.alert('Sucesso', `${result.created} endereços importados!`);
      }
      if (result.errors.length > 0) {
        Alert.alert('Avisos', `${result.errors.length} linhas com erro. Verifique o console.`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao importar CSV');
    } finally {
      setImporting(false);
    }
  };

  const renderAddress = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.addressCard} onPress={() => router.push(`/addresses/${item.id}`)}>
      <View style={styles.addressHeader}>
        <View style={styles.addressInfo}>
          <Text style={styles.addressName}>{item.nome}</Text>
          <Text style={styles.addressText}>{item.enderecoFormatado}</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
          <Ionicons name="trash-outline" size={22} color="#DC2626" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.addressDetails}>
        {item.bairro && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={14} color="#64748B" />
            <Text style={styles.detailText}>{item.bairro}, {item.cidade} - {item.estado}</Text>
          </View>
        )}
        {item.cep && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="mail" size={14} color="#64748B" />
            <Text style={styles.detailText}>CEP: {item.cep}</Text>
          </View>
        )}
        {item.destinatario && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account" size={14} color="#0066CC" />
            <Text style={styles.detailTextDestinatario}>
              {item.destinatario.nome} - {item.destinatario.telefone} ({item.destinatario.notificar})
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Endereços</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/addresses/new')}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={addresses}
        renderItem={renderAddress}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0066CC']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Nenhum endereço cadastrado</Text>
            <Text style={styles.emptySubtitle}>Toque no + para adicionar seu primeiro endereço</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={() => router.push('/addresses/new')}>
              <Text style={styles.addFirstButtonText}>Adicionar primeiro endereço</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Import CSV Modal */}
      <Modal visible={showImportModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Importar CSV</Text>
            <TouchableOpacity onPress={() => setShowImportModal(false)}>
              <Ionicons name="close" size={28} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalInstruction}>
              Cole o conteúdo do CSV abaixo. Colunas esperadas:
            </Text>
            <Text style={styles.modalColumns}>
              nome, endereco, latitude, longitude, cep, bairro, cidade, estado, observacoes, destinatario_nome, destinatario_telefone, destinatario_notificar
            </Text>
            <TextInput
              style={styles.csvTextArea}
              value={csvText}
              onChangeText={setCsvText}
              placeholder="nome,endereco,latitude,longitude,cep,bairro,cidade,estado,observacoes,destinatario_nome,destinatario_telefone,destinatario_notificar
Restaurante A,Rua Augusta 500,-23.5613,-46.6565,01305-000,Consolação,São Paulo,SP,,João Silva,(11) 99999-8888,sempre
Cliente 1,Av. Paulista 1000,-23.5733,-46.6417,01310-100,Bela Vista,São Paulo,SP,Portaria 24h,Maria Santos,(11) 88888-7777,sempre"
              multiline
              numberOfLines={15}
            />
            {importResult && (
              <View style={styles.importResult}>
                <Text style={styles.importResultTitle}>Resultado:</Text>
                <Text style={styles.importResultText}>✅ {importResult.created} importados</Text>
                {importResult.errors.length > 0 && (
                  <Text style={styles.importResultError}>⚠️ {importResult.errors.length} erros</Text>
                )}
              </View>
            )}
            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => setShowImportModal(false)} color="#94A3B8" />
              <Button title={importing ? 'Importando...' : 'Importar'} onPress={handleImport} disabled={importing} color="#0066CC" />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Imports
import { router } from 'expo-router';
import { useState } from 'react';