// Faixa fixa do teste grátis de 3 dias ("termina em ...") + aviso quando o teste tenta algo que ele não permite.
// Só aparece em sessão de teste (account.isDemoTrial); fica fora da área que rola, então não some ao descer a página.
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../auth/i18n.js';
import { BRAND } from '../auth/brand.jsx';
import { DEMO_BLOCKED_EVENT } from '../auth/session.js';
import { LEGAL_SUPPORT_EMAIL } from '../legalContent.js';
import api from '../api.js';

const LOCALES = { en: 'en-US', pt: 'pt-BR', es: 'es-US' };

export function formatTrialEnd(iso, lang) {
  const end = iso ? new Date(iso) : null;
  if (!end || Number.isNaN(end.getTime())) return '';
  return end.toLocaleString(LOCALES[lang] || 'en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TrialBanner() {
  const { account } = useAuth();
  const { t, lang } = useT();
  const [blocked, setBlocked] = useState(false);
  const isTrial = !!account?.isDemoTrial;
  const endsAt = account?.demoExpiresAt;

  useEffect(() => {
    if (!isTrial) return undefined;
    let timer;
    const onBlocked = () => {
      setBlocked(true);
      clearTimeout(timer);
      timer = setTimeout(() => setBlocked(false), 6000);
    };
    window.addEventListener(DEMO_BLOCKED_EVENT, onBlocked);
    return () => { window.removeEventListener(DEMO_BLOCKED_EVENT, onBlocked); clearTimeout(timer); };
  }, [isTrial]);

  // Se o prazo acabar com a tela aberta, uma chamada qualquer devolve 401 e a tela volta ao login com o aviso.
  useEffect(() => {
    if (!isTrial || !endsAt) return undefined;
    const id = setInterval(() => {
      if (Date.now() >= new Date(endsAt).getTime()) api.billingStatus().catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [isTrial, endsAt]);

  if (!isTrial) return null;
  const mail = `mailto:${LEGAL_SUPPORT_EMAIL}?subject=${encodeURIComponent(t('trial.mailSubject', { app: BRAND.name }))}`;
  return (
    <>
      <div
        data-testid="trial-banner"
        className="flex-shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 bg-brandTint text-brand border-b border-line px-4 py-2 text-[12.5px]"
      >
        <p className="min-w-0 font-medium" style={{ overflowWrap: 'anywhere' }}>
          <span data-testid="trial-banner-text">{t('trial.banner', { date: formatTrialEnd(endsAt, lang) })}</span>
          <span className="hidden lg:inline font-normal text-brand/80"> · {t('trial.bannerNote')}</span>
        </p>
        <a
          href={mail}
          title={t('trial.subscribeTitle')}
          data-testid="trial-subscribe"
          className="flex-shrink-0 inline-flex items-center h-7 px-3 rounded-md bg-brand text-white text-[12px] font-semibold hover:bg-brand/90"
        >
          {t('trial.subscribe')}
        </a>
      </div>
      {blocked && (
        <div
          role="status"
          data-testid="demo-blocked-toast"
          className="fixed z-50 bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[28rem] flex items-start gap-3 bg-ink text-white text-[13px] rounded-lg shadow-lg px-4 py-3"
        >
          <span className="flex-grow min-w-0" style={{ overflowWrap: 'anywhere' }}>{t('trial.blocked')}</span>
          <button type="button" onClick={() => setBlocked(false)} aria-label={t('trial.close')} className="flex-shrink-0 text-white/70 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}
    </>
  );
}
