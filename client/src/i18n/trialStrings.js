// Textos do teste grátis de 3 dias (botão no login, formulário, faixa fixa, aviso de ação bloqueada, teste vencido).
// Cada chave: [en, pt, es]. Ligado ao dicionário de idiomas do Cohort (auth/strings.js) por mergeTrialStrings(), do mesmo
// jeito que photoImportStrings.js entra em outros produtos. Placeholders {x} são trocados por t(chave, { x }).
const S = {
  "trial.ctaLead": ["Just exploring?", "Só conhecendo?", "¿Solo explorando?"],
  "trial.cta": ["Try it free for 3 days", "Teste grátis de 3 dias", "Prueba gratis de 3 días"],
  "trial.intro": [
    "Try {app} free for 3 days with sample school data — no credit card required.",
    "Teste o {app} grátis por 3 dias com dados de exemplo de uma escola — sem cartão de crédito.",
    "Prueba {app} gratis por 3 días con datos de ejemplo de una escuela — sin tarjeta de crédito.",
  ],
  "trial.name": ["Name", "Nome", "Nombre"],
  "trial.start": ["Start my trial", "Começar meu teste", "Empezar mi prueba"],
  "trial.starting": ["Starting…", "Iniciando…", "Iniciando…"],
  "trial.cancel": ["Cancel", "Cancelar", "Cancelar"],
  "trial.banner": ["Free trial: ends {date}", "Teste grátis: termina em {date}", "Prueba gratis: termina el {date}"],
  "trial.bannerNote": [
    "Sample data only. Messages, billing and accounts are off in the trial.",
    "Só dados de exemplo. Mensagens, cobrança e contas ficam desligadas no teste.",
    "Solo datos de ejemplo. Los mensajes, el cobro y las cuentas están desactivados en la prueba.",
  ],
  "trial.subscribe": ["Subscribe", "Quero assinar", "Quiero suscribirme"],
  "trial.subscribeTitle": [
    "Talk to Impact Digital to subscribe",
    "Fale com a Impact Digital para assinar",
    "Habla con Impact Digital para suscribirte",
  ],
  "trial.mailSubject": ["{app} - I want to subscribe", "{app} - Quero assinar", "{app} - Quiero suscribirme"],
  "trial.blocked": [
    "Not available in the free trial. Talk to Impact Digital to get your own account.",
    "Não disponível no teste grátis. Fale com a Impact Digital para ter a sua conta.",
    "No disponible en la prueba gratis. Habla con Impact Digital para tener tu cuenta.",
  ],
  "trial.close": ["Close", "Fechar", "Cerrar"],
  "trial.ended": [
    "Your free trial has ended. To keep using {app}, talk to Impact Digital.",
    "Seu teste grátis terminou. Para continuar usando o {app}, fale com a Impact Digital.",
    "Tu prueba gratis terminó. Para seguir usando {app}, habla con Impact Digital.",
  ],
  "err.demo_blocked": [
    "Not available in the free trial.",
    "Não disponível no teste grátis.",
    "No disponible en la prueba gratis.",
  ],
  "err.demo_expired": [
    "Your free trial has ended.",
    "Seu teste grátis terminou.",
    "Tu prueba gratis terminó.",
  ],
  "err.demo_disabled": [
    "The free trial is not available here.",
    "O teste grátis não está disponível aqui.",
    "La prueba gratis no está disponible aquí.",
  ],
};

export function mergeTrialStrings(TR) {
  const idx = { en: 0, pt: 1, es: 2 };
  for (const [key, vals] of Object.entries(S)) {
    for (const lang of Object.keys(idx)) TR[lang][key] = vals[idx[lang]];
  }
}
