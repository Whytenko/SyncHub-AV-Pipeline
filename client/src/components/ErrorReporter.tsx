import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const ErrorReporter = () => {
  const { showToast } = useToast();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || 'Неизвестная ошибка';
      console.error('Client error:', event.error || event.message);
      showToast(`Ошибка: ${message}`, 'error');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || 'Неизвестная ошибка');
      console.error('Unhandled rejection:', event.reason);
      showToast(`Ошибка: ${message}`, 'error');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [showToast]);

  return null;
};

export default ErrorReporter;
