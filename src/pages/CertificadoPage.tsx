import { useState } from 'react';
import { DB, fmtDate } from '@/lib/db';
import { PageHeader, FormCard, Field, Input, Btn } from '@/components/ui-custom';
import type { CertificadoConfig } from '@/lib/db';
import logoImg from '@/assets/logo.png';

const toBase64 = (url: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });

const DEFAULT_CFG: CertificadoConfig = {
  nomeEmpresa: 'F&A Higienizações', cnpj: '46.649.584/0001-21',
  endereco: '', telefone: '', responsavel: '', cargo: 'Responsável Técnico', logoUrl: '',
};

export default function CertificadoPage() {
  const cfg: CertificadoConfig = { ...DEFAULT_CFG, ...(DB.getObj('config').certificadoConfig || {}) };

  const [cliente, setCliente] = useState({ nome: '', cnpj: '', endereco: '', telefone: '' });
  const [servico, setServico] = useState({
    descricao: '', local: '', dataServico: new Date().toISOString().slice(0, 10),
    area: '', metodo: '', produtos: '', responsavelTec: cfg.responsavel || '',
  });
  const [numero, setNumero] = useState(String(Date.now()).slice(-6));
  const [validade, setValidade] = useState('');
  const [obs, setObs] = useState('');

  const setCli = (k: keyof typeof cliente, v: string) => setCliente(p => ({ ...p, [k]: v }));
  const setSvc = (k: keyof typeof servico, v: string) => setServico(p => ({ ...p, [k]: v }));

  const exportPDF = async () => {
    const win = window.open('', '_blank', 'width=960,height=700');
    if (!win) { alert('Popup bloqueado!'); return; }
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    const dataServicoFmt = fmtDate(servico.dataServico);
    const validadeFmt = validade ? fmtDate(validade) : '—';
    const logoBase64 = await toBase64(logoImg);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Certificado Nº ${numero}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
  .page{padding:32px 40px;max-width:780px;margin:0 auto}
  .header{text-align:center;border-bottom:4px solid #1a1a1a;padding-bottom:20px;margin-bottom:24px;position:relative}
  .cert-badge{position:absolute;top:0;right:0;background:#1a1a1a;color:#d4a017;padding:6px 16px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:2px}
  .company-name{font-size:26px;font-weight:900;letter-spacing:1px;color:#1a1a1a}
  .company-sub{font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin:2px 0 6px}
  .company-info{font-size:10px;color:#555;line-height:1.8}
  .title-block{text-align:center;margin:24px 0;padding:20px;border:2px solid #1a1a1a;border-radius:8px;background:#fafafa}
  .title-main{font-size:22px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#1a1a1a}
  .title-sub{font-size:11px;color:#888;margin-top:4px;letter-spacing:1px}
  .cert-num{font-size:10px;color:#d4a017;font-weight:700;margin-top:6px}
  .section-bar{background:#1a1a1a;color:#d4a017;padding:5px 14px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:18px 0 10px;border-radius:3px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;background:#fafafa;border:1px solid #e8e8e8;border-radius:6px;padding:12px 16px}
  .info-row{font-size:10.5px;line-height:2}
  .info-row b{color:#555;font-weight:600}
  .info-row.full{grid-column:1/-1}
  .statement{margin:20px 0;padding:16px 20px;background:#fafafa;border-left:4px solid #d4a017;border-radius:0 6px 6px 0;font-size:11px;line-height:1.9;color:#333}
  .statement b{color:#1a1a1a}
  .sign-block{margin-top:36px;display:flex;justify-content:space-around;align-items:flex-end}
  .sign-line{text-align:center;min-width:180px}
  .sign-rule{border-top:1.5px solid #1a1a1a;margin-bottom:6px}
  .sign-name{font-size:11px;font-weight:700}
  .sign-role{font-size:9.5px;color:#888}
  .footer{text-align:center;margin-top:28px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:9px;color:#aaa;line-height:1.9}
  .seal{width:70px;height:70px;border:3px solid #1a1a1a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;text-align:center;line-height:1.3;color:#1a1a1a;letter-spacing:0.5px;text-transform:uppercase;padding:6px}
  @media print{.page{padding:14px} @page{margin:8mm;size:A4}}
</style></head>
<body><div class="page">
  <div class="header">
    <div class="cert-badge">CERTIFICADO OFICIAL</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px;">
      ${logoBase64 ? `<img src="${logoBase64}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #d4a017;" alt="Logo"/>` : ''}
      <div>
        <div class="company-name">${cfg.nomeEmpresa}</div>
        <div class="company-sub">Serviços de Higienização Profissional</div>
      </div>
    </div>
    <div class="company-info">
      CNPJ: ${cfg.cnpj}
      ${cfg.endereco ? ' &nbsp;|&nbsp; ' + cfg.endereco : ''}
      ${cfg.telefone ? ' &nbsp;|&nbsp; 📞 ' + cfg.telefone : ''}
    </div>
  </div>

  <div class="title-block">
    <div class="title-main">Certificado de Serviço Executado</div>
    <div class="title-sub">Higienização e Sanitização Profissional</div>
    <div class="cert-num">Nº ${numero} &nbsp;·&nbsp; Emitido em ${dataEmissao}</div>
  </div>

  ${cliente.nome ? `
  <div class="section-bar">Contratante</div>
  <div class="info-grid">
    <div class="info-row"><b>Nome / Empresa:</b> ${cliente.nome}</div>
    ${cliente.cnpj ? `<div class="info-row"><b>CNPJ/CPF:</b> ${cliente.cnpj}</div>` : ''}
    ${cliente.endereco ? `<div class="info-row full"><b>Endereço:</b> ${cliente.endereco}</div>` : ''}
    ${cliente.telefone ? `<div class="info-row"><b>Telefone:</b> ${cliente.telefone}</div>` : ''}
  </div>` : ''}

  <div class="section-bar">Serviço Realizado</div>
  <div class="info-grid">
    <div class="info-row"><b>Data de Execução:</b> ${dataServicoFmt}</div>
    <div class="info-row"><b>Validade:</b> ${validadeFmt}</div>
    ${servico.local ? `<div class="info-row full"><b>Local / Ambiente:</b> ${servico.local}</div>` : ''}
    ${servico.area ? `<div class="info-row"><b>Área Tratada:</b> ${servico.area}</div>` : ''}
    ${servico.metodo ? `<div class="info-row"><b>Método Aplicado:</b> ${servico.metodo}</div>` : ''}
    ${servico.produtos ? `<div class="info-row full"><b>Produtos Utilizados:</b> ${servico.produtos}</div>` : ''}
    ${servico.descricao ? `<div class="info-row full"><b>Descrição do Serviço:</b> ${servico.descricao}</div>` : ''}
    ${servico.responsavelTec ? `<div class="info-row"><b>Responsável Técnico:</b> ${servico.responsavelTec}</div>` : ''}
  </div>

  <div class="statement">
    Certificamos que os serviços de higienização e sanitização foram realizados por equipe qualificada
    da <b>${cfg.nomeEmpresa}</b>, seguindo todas as normas técnicas e de segurança aplicáveis,
    com uso de produtos regularizados pela ANVISA, garantindo a eficácia e segurança do tratamento realizado.
    ${obs ? '<br><br><b>Observações:</b> ' + obs : ''}
  </div>

  <div class="sign-block">
    <div class="sign-line">
      <div class="sign-rule"></div>
      <div class="sign-name">${servico.responsavelTec || cfg.responsavel || '___________________'}</div>
      <div class="sign-role">${cfg.cargo}</div>
      <div class="sign-role">${cfg.nomeEmpresa}</div>
    </div>
    ${logoBase64 ? `<img src="${logoBase64}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #d4a017;" alt="Logo"/>` : `<div class="seal">${cfg.nomeEmpresa.split(' ').slice(0,2).join('<br>')}✓</div>`}
    <div class="sign-line">
      <div class="sign-rule"></div>
      <div class="sign-name">${cliente.nome || 'Contratante'}</div>
      <div class="sign-role">Assinatura / Carimbo</div>
      <div class="sign-role">Data: ___/___/______</div>
    </div>
  </div>

  <div class="footer">
    ${cfg.nomeEmpresa} &nbsp;·&nbsp; CNPJ ${cfg.cnpj}<br>
    Documento emitido em ${dataEmissao} &nbsp;·&nbsp; Certificado Nº ${numero}<br>
    Este documento comprova a execução dos serviços de higienização e sanitização profissional.
  </div>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <>
      <PageHeader title="Gerador de Certificado" icon="📜">
        <Btn onClick={exportPDF}>🖨️ Gerar / Imprimir PDF</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">

        <FormCard title="Identificação do Certificado" icon="🔢">
          <div className="flex gap-2.5 flex-wrap">
            <Field label="Nº do Certificado" className="w-[140px]">
              <Input value={numero} onChange={e => setNumero(e.target.value)} />
            </Field>
            <Field label="Validade do Certificado" className="w-[180px]">
              <Input type="date" value={validade} onChange={e => setValidade(e.target.value)} />
            </Field>
          </div>
        </FormCard>

        <FormCard title="Dados do Contratante (Cliente)" icon="👤">
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Nome / Empresa" className="flex-[3] min-w-[200px]">
              <Input value={cliente.nome} onChange={e => setCli('nome', e.target.value)} placeholder="Nome do cliente ou empresa" />
            </Field>
            <Field label="CNPJ / CPF" className="flex-[2] min-w-[130px]">
              <Input value={cliente.cnpj} onChange={e => setCli('cnpj', e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Field label="Endereço" className="flex-[3] min-w-[200px]">
              <Input value={cliente.endereco} onChange={e => setCli('endereco', e.target.value)} />
            </Field>
            <Field label="Telefone" className="flex-[2] min-w-[120px]">
              <Input value={cliente.telefone} onChange={e => setCli('telefone', e.target.value)} />
            </Field>
          </div>
        </FormCard>

        <FormCard title="Dados do Serviço Executado" icon="🧹">
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Data de Execução" required className="flex-1 min-w-[140px]">
              <Input type="date" value={servico.dataServico} onChange={e => setSvc('dataServico', e.target.value)} />
            </Field>
            <Field label="Local / Ambiente" className="flex-[3] min-w-[200px]">
              <Input value={servico.local} onChange={e => setSvc('local', e.target.value)} placeholder="Ex: Cozinha industrial, depósito, escritório..." />
            </Field>
          </div>
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Área Tratada" className="flex-1 min-w-[120px]">
              <Input value={servico.area} onChange={e => setSvc('area', e.target.value)} placeholder="Ex: 200 m²" />
            </Field>
            <Field label="Método Aplicado" className="flex-[2] min-w-[150px]">
              <Input value={servico.metodo} onChange={e => setSvc('metodo', e.target.value)} placeholder="Ex: Nebulização UBV, higienização a vapor..." />
            </Field>
            <Field label="Responsável Técnico" className="flex-[2] min-w-[150px]">
              <Input value={servico.responsavelTec} onChange={e => setSvc('responsavelTec', e.target.value)} />
            </Field>
          </div>
          <Field label="Produtos Utilizados (ANVISA)" className="w-full mb-2.5">
            <Input value={servico.produtos} onChange={e => setSvc('produtos', e.target.value)} placeholder="Ex: Hipoclorito de sódio, quaternário de amônio..." />
          </Field>
          <Field label="Descrição Completa do Serviço" className="w-full">
            <textarea
              value={servico.descricao}
              onChange={e => setSvc('descricao', e.target.value)}
              rows={3}
              className="w-full p-[8px_10px] bg-input border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary"
              placeholder="Descreva os serviços realizados em detalhes..."
            />
          </Field>
        </FormCard>

        <FormCard title="Observações Adicionais" icon="📄">
          <Field label="Observações / Recomendações" className="w-full">
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              className="w-full p-[8px_10px] bg-input border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary"
              placeholder="Recomendações pós-serviço, próxima aplicação, etc."
            />
          </Field>
        </FormCard>

        <div className="flex justify-end mt-2">
          <Btn onClick={exportPDF}>🖨️ Gerar / Imprimir PDF</Btn>
        </div>
      </div>
    </>
  );
}
