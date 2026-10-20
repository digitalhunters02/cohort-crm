// planConfig.js
// ARQUIVO DE AJUSTE (o único dos arquivos de "selo de plano" que é específico do produto): aqui ficam as ligações com este app.
// Os demais (PlanBadge, PlanUpsellModal, PlanPreview, planPreview, planStrings) são cópias do kit do Rex, iguais em todos os CRMs.
// Os planos, preços, o plano mínimo de cada recurso e o que cada plano acrescenta vêm do SERVIDOR (/api/billing/status,
// /api/public/plans; server/src/planConfig.js: FEATURE_MIN_PLAN). Aqui só ficam: textos dos recursos, quais itens de menu têm
// selo e os nomes de exibição dos planos.
import { BASE } from "../api.js";

export const API_URL = BASE; // endereço da API deste app (o cabeçalho X-Preview-Plan só vai para ele)
export const APP_NAME = "Cohort"; // aparece na faixa "Você está vendo o … como o plano …"
export const PREVIEW_STORAGE_KEY = "cohort_preview_plan"; // chave do localStorage (única por produto)
export const CURRENCY = "USD"; // moeda dos preços do catálogo (código ISO)

// Nomes de exibição dos planos (as chaves são as do servidor: o plano de entrada se chama "basico" e aparece como Essential).
// Ordem dos idiomas: [en, pt, es].
export const PLAN_NAMES = {
  basico: ["Essential", "Essencial", "Esencial"],
  essencial: ["Professional", "Profissional", "Profesional"],
  completo: ["Complete", "Completo", "Completo"],
};

// Itens de menu (rota) -> recurso do servidor (chave de FEATURE_MIN_PLAN em server/src/planConfig.js).
export const NAV_GATES = {
  "/seats": "seats",
  "/interviews": "interviews",
  "/contracts": "enrollment_contract",
  "/tuition": "tuition",
  "/financial-aid": "financial_aid",
  "/whatsapp": "whatsapp",
  "/automations": "automations",
  "/reports": "reports",
};

// Texto de cada recurso com selo: nome curto + 1–2 frases do que faz. Ordem dos idiomas: [en, pt, es].
// Para um recurso novo: acrescente a chave igual à de FEATURE_MIN_PLAN no servidor.
export const GATE_TEXT = {
  interviews: {
    name: ["Interviews", "Entrevistas", "Entrevistas"],
    what: ["Schedule admission interviews with families and keep the notes and the decision for each applicant.", "Agende entrevistas de admissão com as famílias e guarde as anotações e a decisão de cada candidato.", "Programe entrevistas de admisión con las familias y guarde las notas y la decisión de cada candidato."],
  },
  financial_aid: {
    name: ["Financial aid", "Bolsas e auxílio financeiro", "Ayuda financiera"],
    what: ["Track each family's aid request, the amount awarded and the decision in one place.", "Acompanhe o pedido de bolsa de cada família, o valor concedido e a decisão num só lugar.", "Siga la solicitud de ayuda de cada familia, el monto otorgado y la decisión en un solo lugar."],
  },
  tuition: {
    name: ["Tuition & billing", "Mensalidades e cobrança", "Matrícula y cobros"],
    what: ["Create tuition invoices and see at a glance who has paid and who is late.", "Crie as faturas de mensalidade e veja de relance quem pagou e quem está atrasado.", "Cree las facturas de matrícula y vea de un vistazo quién pagó y quién está atrasado."],
  },
  reports: {
    name: ["Reports", "Relatórios", "Informes"],
    what: ["Admissions funnel, enrollment and tuition numbers, ready to look at or export.", "Funil de admissão, matrículas e números de mensalidade, prontos para ver ou exportar.", "Embudo de admisiones, matrícula y números de cobros, listos para ver o exportar."],
  },
  online_application: {
    name: ["Online inquiry form", "Formulário de interesse online", "Formulario de consulta en línea"],
    what: ["A public page where families ask for information; each request lands in Inquiries by itself.", "Uma página pública onde as famílias pedem informações; cada pedido cai sozinho em Inquiries.", "Una página pública donde las familias piden información; cada solicitud llega sola a Inquiries."],
  },
  recommendations: {
    name: ["Teacher recommendations", "Cartas de recomendação de professores", "Cartas de recomendación de docentes"],
    what: ["Send a private link to a teacher to write a recommendation, and see it arrive on the applicant.", "Envie um link privado para o professor escrever a recomendação e veja ela chegar no candidato.", "Envíe un enlace privado al docente para escribir la recomendación y véala llegar al candidato."],
  },
  seats: {
    name: ["Seats & capacity", "Vagas e capacidade", "Cupos y capacidad"],
    what: ["Set how many seats each grade has and see what is taken, open or on the waitlist.", "Defina quantas vagas cada série tem e veja o que está ocupado, aberto ou na lista de espera.", "Defina cuántos cupos tiene cada grado y vea lo ocupado, lo libre y la lista de espera."],
  },
  payment_plans: {
    name: ["Payment plans", "Planos de pagamento", "Planes de pago"],
    what: ["Split the year's tuition into scheduled installments for a family, in one step.", "Divida a anuidade em parcelas programadas para uma família, num só passo.", "Divida la matrícula del año en cuotas programadas para una familia, en un solo paso."],
  },
  family_portal: {
    name: ["Family portal", "Portal da família", "Portal de la familia"],
    what: ["Give each family a private link to see their students, invoices and documents, with no login.", "Dê a cada família um link privado para ver alunos, faturas e documentos, sem login.", "Dé a cada familia un enlace privado para ver sus estudiantes, facturas y documentos, sin iniciar sesión."],
  },
  enrollment_contract: {
    name: ["E-signed enrollment contracts", "Contratos de matrícula com assinatura", "Contratos de matrícula con firma"],
    what: ["Send the enrollment contract by link and the family signs it on their phone.", "Envie o contrato de matrícula por link e a família assina pelo celular.", "Envíe el contrato de matrícula por enlace y la familia lo firma desde su celular."],
  },
  automations: {
    name: ["Automations", "Automações", "Automatizaciones"],
    what: ["Messages and tasks that go out by themselves when an applicant changes stage.", "Mensagens e tarefas que saem sozinhas quando um candidato muda de etapa.", "Mensajes y tareas que salen solos cuando un candidato cambia de etapa."],
  },
  whatsapp: {
    name: ["WhatsApp", "WhatsApp", "WhatsApp"],
    what: ["Message families on WhatsApp from inside Cohort, with your own WhatsApp Business account.", "Fale com as famílias pelo WhatsApp dentro do Cohort, com a sua conta WhatsApp Business.", "Escriba a las familias por WhatsApp desde Cohort, con su propia cuenta de WhatsApp Business."],
  },
};
