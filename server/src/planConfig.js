// Planos de Cohort: preços, limites e o que cada plano libera. Chaves de plano seguem o portfólio
// (basico / essencial / completo); os nomes na tela são os de PLAN_LABELS.
export const PRODUCT = { key: 'cohort', name: 'Cohort' };
export const PLAN_RANK = { basico: 1, essencial: 2, completo: 3 };
export const PLAN_LABELS = { basico: 'Essential', essencial: 'Professional', completo: 'Complete' };
// US$ por mês (o anual é 10% abaixo de 12 mensalidades).
export const PLAN_PRICES = { basico: 59, essencial: 129, completo: 249 };
// Logins de equipe por plano. "Completo ilimitado" ainda será discutido: PLAN_COMPLETO_USER_LIMIT põe um teto.
const cap = Number(process.env.PLAN_COMPLETO_USER_LIMIT);
export const PLAN_USER_LIMITS = { basico: 3, essencial: 10, completo: cap > 0 ? cap : Infinity };
// Limites extras por tipo de registro (ex.: alunos).
export const PLAN_EXTRA_LIMITS = {
  students: { basico: 50, essencial: 200, completo: 600 }
};
// Recurso → menor plano que o libera (tudo que não está aqui vale para todos os planos).
export const FEATURE_MIN_PLAN = {
  interviews: 'essencial',
  financial_aid: 'essencial',
  tuition: 'essencial',
  reports: 'essencial',
  online_application: 'essencial',
  recommendations: 'essencial',
  seats: 'essencial',
  payment_plans: 'completo',
  family_portal: 'completo',
  enrollment_contract: 'completo',
  automations: 'completo',
  whatsapp: 'completo',
};
// Rotas da API protegidas por plano: [prefixo, recurso]. Valem só depois do login.
export const API_GATES = [
  ['/api/seats', 'seats'],
  ['/api/tuition-plans', 'payment_plans'],
  ['/api/contracts', 'enrollment_contract'],
  ['/api/interviews', 'interviews'],
  ['/api/financial-aid', 'financial_aid'],
  ['/api/tuition-invoices', 'tuition'],
  ['/api/reports', 'reports'],
  ['/api/automations', 'automations'],
  ['/api/integrations/whatsapp', 'whatsapp'],
];
