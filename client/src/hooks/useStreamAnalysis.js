import { useState, useCallback } from 'react';

/**
 * Custom hook to handle real-time streaming analysis via SSE.
 */
export function useStreamAnalysis() {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'

  const startStream = useCallback((endpoint) => {
    setStatus('loading');
    setProgress(0);
    setMessage('جاري الاتصال...');
    setResult(null);

    const eventSource = new EventSource(endpoint);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'start':
            setMessage(data.message);
            break;
            
          case 'progress':
            setProgress(data.value);
            if (data.message) setMessage(data.message);
            break;
            
          case 'result':
            setResult(data.data || data.proposal || data);
            setStatus('done');
            eventSource.close();
            break;
            
          case 'error':
            setMessage(data.message || 'حدث خطأ غير متوقع');
            setStatus('error');
            eventSource.close();
            break;
            
          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      setMessage('انقطع الاتصال بالخادم');
      setStatus('error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { progress, message, result, status, setStatus, startStream };
}
