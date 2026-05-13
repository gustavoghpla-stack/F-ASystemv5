# F&A Higienizações — Sistema de Gestão

Sistema desktop (Electron) + web para gestão completa: funcionários, bancos, escalas, estoque, abastecimento, fluxo de caixa, orçamentos, certificados e controle de equipe — com sincronização para Google Sheets.

## 🚀 Como gerar o executável Windows

### Opção A — GitHub Actions (recomendado)

1. Conecte o projeto ao GitHub via **Lovable → GitHub → Connect**.
2. Faça push da branch `main` (ou crie uma tag `v1.0.0`).
3. O workflow `.github/workflows/build-windows.yml` roda automaticamente.
4. Acesse a aba **Actions** do repositório → abra o run mais recente → baixe o artefato `FA-Higienizacoes-win32-x64.zip`.
5. Se for tag `v*`, o ZIP é publicado automaticamente em **Releases**.

### Opção B — Compilar localmente (Windows)

Pré-requisitos: Node.js 20+ e Git.

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPO.git
cd SEU-REPO
npm install
npm run desktop:build
```

O executável fica em `release/FA-Higienizacoes-win32-x64/FA-Higienizacoes.exe`.
Para distribuir, compacte a pasta inteira (todos os arquivos são necessários).

### Opção C — Compilar localmente (Linux/macOS para Windows)

```bash
npm install
npm run build
npx @electron/packager . FA-Higienizacoes --platform=win32 --arch=x64 --out=release --overwrite
```

## 🔗 Configuração das planilhas Google Sheets

São 4 planilhas independentes, cada uma com seu próprio Google Apps Script:

| Planilha | Script | URL Config |
|----------|--------|------------|
| Funcionários / Bancos / Escalas / Documentos / Usuários | `gas/script.gs` | URL Funcionários |
| Estoque / Abastecimento / Veículos | `gas/script-estoque.gs` | URL Estoque |
| Fluxo de Caixa / Custos Fixos | `gas/script-fluxo.gs` | URL Financeiro |
| Controle de Equipe | `gas/script-equipe.gs` | URL Equipe |

Para cada planilha:
1. Abra o Google Sheets → **Extensões → Apps Script**
2. Cole o conteúdo do `.gs` correspondente
3. **Implantar → Nova implantação** → Tipo: **Aplicativo da Web**
4. Configure: **Executar como: Eu** | **Quem tem acesso: Qualquer pessoa, mesmo anônima**
5. Clique em **Implantar**, autorize, copie a URL gerada
6. No sistema: **Configurações → Integração Google Planilhas** (senha mestra) → cole a URL e salve

> ⚠️ **Erro HTTP 401**: Geralmente significa que a implantação está como "Apenas eu". Repita o passo 4 e gere uma NOVA URL.

## 🔐 Permissões

- **Padrão = Negado**: novos usuários começam sem acesso a nenhum módulo.
- **Master** (`feaviplimpeza@gmail.com`): acesso total. Senha padrão: `@Line2122!` (recomendado alterar).
- O **Cargo** (Operador, Estoquista, etc.) é apenas informativo.
- Permissões são liberadas em **Configurações → Permissões por Usuário** (toggles).

## 👋 Funcionários demitidos

Funcionários com data de demissão preenchida:
- **Somem** de: Cadastro de Funcionários, Bancos/PIX, Controle de Equipe, Escalas
- **Aparecem** em: Relatórios → Funcionários (filtro "Demitido") com botão **+Info** (ver cadastro original) e **PDF**

## 💾 Sincronização

- **Auto-sync**: 800ms após qualquer alteração local
- **Sync imediato**: após exclusões (garante remoção da linha na planilha)
- **Carregar da Planilha**: substitui dados locais pelos da planilha (recarrega a página)

## 🛠 Stack

React 18 · Vite 5 · TypeScript · Tailwind · Electron 41 · Recharts
