import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../context/I18nContext';

const ErrorReporter = () => {
  const { showToast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || t('Неизвестная ошибка');
      console.error('Client error:', event.error || event.message);
      showToast(t('Ошибка: {message}', { message }), 'error');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || t('Неизвестная ошибка'));
      console.error('Unhandled rejection:', event.reason);
      showToast(t('Ошибка: {message}', { message }), 'error');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [showToast, t]);

  return null;
};

export default ErrorReporter;
