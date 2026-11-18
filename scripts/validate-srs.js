#!/usr/bin/env node
/**
 * SRS Validation Script
 * Valida se o SRS.md está completo conforme template
 */

const fs = require('fs');
const path = require('path');

function validateSRS(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];
  const warnings = [];

  console.log('🔍 Validando SRS...\n');

  // 1. Verifica seções obrigatórias
  const requiredSections = [
    '## 1. Introdução',
    '### 1.1 Propósito',
    '### 1.2 Escopo',
    '### 1.3 Definições',
    '### 1.4 Referências',
    '### 1.5 Visão Geral',
    '## 2. Descrição Geral',
    '### 2.1 Perspectiva do Produto',
    '### 2.2 Funções do Produto',
    '### 2.3 Características dos Usuários',
    '### 2.4 Restrições',
    '### 2.5 Premissas e Dependências',
    '## 3. Requisitos Funcionais (RF)',
    '## 4. Requisitos Não-Funcionais (RNF)',
    '## 5. Requisitos de Interface',
    '## 6. Regras de Negócio (RN)',
    '## 7. Matriz de Rastreabilidade',
    '## 8. Riscos e Mitigações',
    '## 9. Glossário',
    '## 10. Aprovações',
  ];

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`❌ Seção obrigatória ausente: ${section}`);
    }
  }

  // 2. Verifica RFs com formato correto
  const rfPattern = /### RF-\d{3}: .+/g;
  const rfs = content.match(rfPattern) || [];
  console.log(`📋 Requisitos Funcionais encontrados: ${rfs.length}`);

  for (const rf of rfs) {
    const rfNum = rf.match(/RF-(\d{3})/)[1];
    const rfSectionStart = content.indexOf(rf);
    const nextRfIndex = content.indexOf('### RF-', rfSectionStart + 1);
    const rfContent = nextRfIndex > 0 ? content.slice(rfSectionStart, nextRfIndex) : content.slice(rfSectionStart);

    // Verifica campos obrigatórios do RF
    const requiredFields = ['**Prioridade:**', '**Ator:**', '**Descrição:**', '**Dependências:**', '**Critério de Aceite (Gherkin):**'];
    for (const field of requiredFields) {
      if (!rfContent.includes(field)) {
        errors.push(`❌ RF-${rfNum}: Campo obrigatório ausente: ${field}`);
      }
    }

    // Verifica Gherkin
    if (!rfContent.includes('```gherkin')) {
      errors.push(`❌ RF-${rfNum}: Critério de aceite não tem bloco Gherkin`);
    } else {
      const gherkin = rfContent.match(/```gherkin\n([\s\S]*?)\n```/);
      if (gherkin) {
        const gherkinContent = gherkin[1];
        if (!gherkinContent.includes('Given') || !gherkinContent.includes('When') || !gherkinContent.includes('Then')) {
          warnings.push(`⚠️ RF-${rfNum}: Gherkin pode estar incompleto (Given/When/Then)`);
        }
      }
    }
  }

  // 3. Verifica RNFs
  const rnfPattern = /### RNF-\d{3}: .+/g;
  const rnfs = content.match(rnfPattern) || [];
  console.log(`📋 Requisitos Não-Funcionais encontrados: ${rnfs.length}`);

  for (const rnf of rnfs) {
    const rnfNum = rnf.match(/RNF-(\d{3})/)[1];
    const rnfSectionStart = content.indexOf(rnf);
    const nextRnfIndex = content.indexOf('### RNF-', rnfSectionStart + 1);
    const rnfContent = nextRnfIndex > 0 ? content.slice(rnfSectionStart, nextRnfIndex) : content.slice(rnfSectionStart);

    const requiredFields = ['**Categoria:**', '**Prioridade:**', '**Descrição:**', '**Métrica/Target:**', '**Validação:**'];
    for (const field of requiredFields) {
      if (!rnfContent.includes(field)) {
        errors.push(`❌ RNF-${rnfNum}: Campo obrigatório ausente: ${field}`);
      }
    }

    // Verifica se métrica é quantificável
    if (rnfContent.includes('**Métrica/Target:**')) {
      const metricMatch = rnfContent.match(/\*\*Métrica\/Target:\*\*\s*(.+)/);
      if (metricMatch && !metricMatch[1].match(/\d/)) {
        warnings.push(`⚠️ RNF-${rnfNum}: Métrica pode não ser quantificável: ${metricMatch[1]}`);
      }
    }
  }

  // 4. Verifica RNs
  const rnPattern = /### RN-\d{3}: .+/g;
  const rns = content.match(rnPattern) || [];
  console.log(`📋 Regras de Negócio encontradas: ${rns.length}`);

  // 5. Verifica Matriz de Rastreabilidade
  if (content.includes('## 7. Matriz de Rastreabilidade')) {
    const matrixSection = content.slice(content.indexOf('## 7. Matriz de Rastreabilidade'));
    const tableMatch = matrixSection.match(/\|[\s\S]*?\|/);
    if (!tableMatch) {
      errors.push('❌ Matriz de Rastreabilidade não tem tabela');
    } else {
      const rows = tableMatch[0].split('\n').filter(r => r.trim().startsWith('|'));
      if (rows.length < 3) {
        warnings.push('⚠️ Matriz de Rastreabilidade pode ter poucas linhas');
      }
    }
  } else {
    errors.push('❌ Seção Matriz de Rastreabilidade ausente');
  }

  // 6. Verifica Riscos
  if (content.includes('## 8. Riscos e Mitigações')) {
    const risksSection = content.slice(content.indexOf('## 8. Riscos e Mitigações'));
    const riskTableMatch = risksSection.match(/\|[\s\S]*?\|/);
    if (!riskTableMatch) {
      warnings.push('⚠️ Seção de Riscos não tem tabela');
    }
  }

  // 7. Verifica Glossário
  if (content.includes('## 9. Glossário')) {
    const glossarySection = content.slice(content.indexOf('## 9. Glossário'));
    const glossaryTableMatch = glossarySection.match(/\|[\s\S]*?\|/);
    if (!glossaryTableMatch) {
      warnings.push('⚠️ Glossário não tem tabela');
    }
  }

  // 8. Verifica Aprovações
  if (content.includes('## 10. Aprovações')) {
    const approvalsSection = content.slice(content.indexOf('## 10. Aprovações'));
    const approvalsTableMatch = approvalsSection.match(/\|[\s\S]*?\|/);
    if (!approvalsTableMatch) {
      warnings.push('⚠️ Seção de Aprovações não tem tabela');
    }
  }

  // Relatório
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE VALIDAÇÃO');
  console.log('='.repeat(60));

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ SRS VÁLIDO - Todas as verificações passaram!');
    console.log(`   • ${rfs.length} RFs validados`);
    console.log(`   • ${rnfs.length} RNFs validados`);
    console.log(`   • ${rns.length} RNs encontrados`);
    return 0;
  }

  if (errors.length > 0) {
    console.log(`\n❌ ERROS (${errors.length}):`);
    errors.forEach(e => console.log(`   ${e}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️ AVISOS (${warnings.length}):`);
    warnings.forEach(w => console.log(`   ${w}`));
  }

  console.log(`\n📊 Resumo: ${rfs.length} RFs, ${rnfs.length} RNFs, ${rns.length} RNs`);
  return errors.length > 0 ? 1 : 0;
}

// Executa
const filePath = process.argv[2] || path.join(__dirname, '../docs/SRS.md');
const exitCode = validateSRS(filePath);
process.exit(exitCode);