#!/bin/bash
# Generate Android Keystore for EntregaFácil
# Run this once to create the keystore.jks file
# Store the passwords securely in GitHub Secrets / EAS Secrets

set -e

KEYSTORE_PATH="./keystore.jks"
KEY_ALIAS="entregafacil"
VALIDITY_DAYS=10000  # ~27 years

echo "🔐 Gerando keystore Android para EntregaFácil..."

# Check if keystore already exists
if [ -f "$KEYSTORE_PATH" ]; then
  echo "⚠️ Keystore já existe em $KEYSTORE_PATH"
  read -p "Deseja sobrescrever? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 1
  fi
fi

# Prompt for passwords
read -s -p "Digite a senha do keystore (mín. 6 chars): " KEYSTORE_PASSWORD
echo
read -s -p "Confirme a senha do keystore: " KEYSTORE_PASSWORD_CONFIRM
echo
if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
  echo "❌ Senhas não conferem"
  exit 1
fi

read -s -p "Digite a senha da chave (pode ser igual à do keystore): " KEY_PASSWORD
echo
read -s -p "Confirme a senha da chave: " KEY_PASSWORD_CONFIRM
echo
if [ "$KEY_PASSWORD" != "$KEY_PASSWORD_CONFIRM" ]; then
  echo "❌ Senhas não conferem"
  exit 1
fi

# Generate keystore
echo "🔨 Gerando keystore..."
keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity $VALIDITY_DAYS \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=EntregaFácil, OU=Mobile, O=EntregaFácil, L=São Paulo, ST=SP, C=BR"

echo ""
echo "✅ Keystore gerado com sucesso em $KEYSTORE_PATH"
echo ""
echo "📋 Configure estas variáveis no EAS Secrets (eas secret:create):"
echo "  ANDROID_KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD"
echo "  ANDROID_KEY_PASSWORD=$KEY_PASSWORD"
echo ""
echo "📋 E faça upload do keystore:"
echo "  eas credentials:upload:android --keystore-path $KEYSTORE_PATH --alias $KEY_ALIAS"
echo ""
echo "⚠️ IMPORTANTE: Guarde as senhas em local seguro! Não perca o arquivo keystore.jks"
echo "   Faça backup seguro (ex: 1Password, Bitwarden, cofre físico)"