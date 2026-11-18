'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, Modal, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAddresses } from '@/shared/hooks/useAddresses';
import { useAppStore } from '@/shared/store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';

export default function NewAddressScreen() {
  const { createAddress, geocode, loading: creating } = useAddresses();
  const { user } = useAppStore();
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    cep: '',
    bairro: '',
    cidade: 'São Paulo',
    estado: 'SP',
    observacoes: '',
    destinatario_nome: '',
    destinatario_telefone: '',
    destinatario_notificar: 'sempre' as 'sempre' | 'nunca' | 'apenas_problema',
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [showDestinatario, setShowDestinatario] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Debounced geocoding
  const debouncedGeocode = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setGeocoding(true);
      try {
        const results = await geocode(query);
        if (results?.results?.length > 0) {
          setSuggestions(results.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setGeocoding(false);
      }
    }, 300),
    [geocode]
  );

  const handleEnderecoChange = (text: string) => {
    setFormData(prev => ({ ...prev, endereco: text }));
    debouncedGeocode(text);
  };

  const handleSuggestionPress = (suggestion: any) => {
    setSelectedSuggestion(suggestion);
    setFormData(prev => ({
      ...prev,
      endereco: suggestion.enderecoFormatado,
      cep: suggestion.cep || '',
      bairro: suggestion.bairro || '',
      cidade: suggestion.cidade || 'São Paulo',
      estado: suggestion.estado || 'SP',
    }));
    setLatitude(suggestion.latitude);
    setLongitude(suggestion.longitude);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }
    if (!formData.endereco.trim()) {
      Alert.alert('Erro', 'Endereço é obrigatório');
      return;
    }
    if (latitude === null || longitude === null) {
      Alert.alert('Erro', 'Selecione um endereço válido da lista');
      return;
    }

    try {
      await createAddress({
        ...formData,
        latitude,
        longitude,
        destinatario: showDestinatario ? {
          nome: formData.destinatario_nome,
          telefone: formData.destinatario_telefone,
          notificar: formData.destinatario_notificar,
        } : undefined,
      });
      Alert.alert('Sucesso', 'Endereço cadastrado com sucesso!');
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao cadastrar endereço');
    }
  };

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
          <Text style={styles.headerTitle}>Novo Endereço</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Endereço</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={text => setFormData(prev => ({ ...prev, nome: text }))}
              placeholder="Ex: Restaurante do João, Cliente Maria"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço *</Text>
            <TextInput
              style={styles.input}
              value={formData.endereco}
              onChangeText={handleEnderecoChange}
              placeholder="Digite para buscar (mín. 3 caracteres)"
              autoCapitalize="words"
            />
            {geocoding && (
              <View style={styles.geocodingIndicator}>
                <ActivityIndicator size="small" color="#0066CC" />
                <Text style={styles.geocodingText}>Buscando...</Text>
              </View>
            )}
          </View>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={suggestions}
                keyExtractor={item => item.placeId || `${item.latitude},${item.longitude}`}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSuggestionPress(item)}>
                    <View style={styles.suggestionIcon}>
                      <Ionicons name="location-outline" size={20} color="#0066CC" />
                    </View>
                    <View style={styles.suggestionInfo} flex={1}>
                      <Text style={styles.suggestionName}>{item.nome}</Text>
                      <Text style={styles.suggestionAddress}>{item.enderecoFormatado}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {selectedSuggestion && (
            <View style={styles.selectedAddress}>
              <Text style={styles.selectedLabel}>Endereço selecionado:</Text>
              <Text style={styles.selectedAddressText}>{selectedSuggestion.enderecoFormatado}</Text>
              <Text style={styles.selectedCoords}>
                Lat: {selectedSuggestion.latitude.toFixed(6)}, Lng: {selectedSuggestion.longitude.toFixed(6)}
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CEP</Text>
            <TextInput
              style={styles.input}
              value={formData.cep}
              onChangeText={text => setFormData(prev => ({ ...prev, cep: text.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2') }))}
              placeholder="00000-000"
              keyboardType="numeric"
              maxLength={9}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.label}>Bairro</Text>
              <TextInput
                style={styles.input}
                value={formData.bairro}
                onChangeText={text => setFormData(prev => ({ ...prev, bairro: text }))}
                placeholder="Bairro"
              />
            </View>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                value={formData.cidade}
                onChangeText={text => setFormData(prev => ({ ...prev, cidade: text }))}
                placeholder="Cidade"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estado</Text>
            <TextInput
              style={styles.input}
              value={formData.estado}
              onChangeText={text => setFormData(prev => ({ ...prev, estado: text.toUpperCase() }))}
              placeholder="SP"
              maxLength={2}
              textTransform="uppercase"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Observações</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.observacoes}
            onChangeText={text => setFormData(prev => ({ ...prev, observacoes: text }))}
            placeholder="Referências, complementos, instruções..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.destinatarioToggle}>
              <Text style={styles.sectionTitle}>Destinatário (para WhatsApp)</Text>
              <TouchableOpacity style={styles.toggleButton} onPress={() => setShowDestinatario(!showDestinatario)}>
                <Text style={styles.toggleText}>{showDestinatario ? 'Ocultar' : 'Adicionar'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDestinatario && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome do Destinatário</Text>
                <TextInput
                  style={styles.input}
                  value={formData.destinatario_nome}
                  onChangeText={text => setFormData(prev => ({ ...prev, destinatario_nome: text }))}
                  placeholder="Nome completo"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefone WhatsApp *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.destinatario_telefone}
                  onChangeText={text => setFormData(prev => ({ ...prev, destinatario_telefone: text.replace(/\D/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3') }))}
                  placeholder="(11) 99999-8888"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notificar via WhatsApp</Text>
                <View style={styles.radioGroup}>
                  {(['sempre', 'apenas_problema', 'nunca'] as const).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.radioOption,
                        formData.destinatario_notificar === opt && styles.radioSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, destinatario_notificar: opt }))}
                    >
                      <View style={[
                        styles.radioCircle,
                        formData.destinatario_notificar === opt && styles.radioCircleSelected,
                      ]} />
                      <Text style={styles.radioLabel}>
                        {opt === 'sempre' ? 'Sempre' : opt === 'apenas_problema' ? 'Apenas problemas' : 'Nunca'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
        </View>

        <View style={styles.submitContainer}>
          <Button
            title={creating ? 'Salvando...' : 'Salvar Endereço'}
            onPress={handleSubmit}
            disabled={creating}
            color="#0066CC"
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Imports
import { router } from 'expo-router';

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}