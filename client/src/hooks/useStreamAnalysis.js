import { useState, useCallback } from 'react';

/**
 * Custom hook to handle real-time streaming analysis via SSE.
 */
export function useStreamAnalysis() {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'

  const startStream = useCallback(async (endpoint, options = {}) => {
    setStatus('loading');
    setProgress(0);
    setMessage('جاري الاتصال...');
    setResult(null);

    const { method = 'GET', body = null } = options;

    try {
      if (method === 'GET' && !body) {
        // Fallback to EventSource for simple GET requests if preferred, 
        // though fetch streaming is more universal for our needs now.
        const eventSource = new EventSource(endpoint);
        
        eventSource.onmessage = (event) => {
          handleStreamData(event.data, eventSource);
        };

        eventSource.onerror = (err) => {
          console.error('EventSource failed:', err);
          setMessage('انقطع الاتصال بالخادم');
          setStatus('error');
          eventSource.close();
        };

        return () => eventSource.close();
      } else {
        // Use fetch for POST or requests with body
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : null,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Split by SSE double newline
          const parts = buffer.split('\n\n');
          buffer = parts.pop(); // Keep incomplete chunk in buffer

          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const dataStr = part.replace(/^data: /, '').trim();
              if (dataStr) {
                handleStreamData(dataStr, { close: () => reader.cancel() });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream failed:', err);
      setMessage(err.message || 'حدث خطأ في الاتصال');
      setStatus('error');
    }
  }, []);

  const handleStreamData = (dataStr, controller) => {
    try {
      const data = JSON.parse(dataStr);
      
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
          controller.close();
          break;
          
        case 'error':
          setMessage(data.message || 'حدث خطأ غير متوقع');
          setStatus('error');
          controller.close();
          break;
          
        default:
          break;
      }
    } catch (err) {
      console.error('Failed to parse stream message:', err);
    }
  };

  return { progress, message, result, status, setStatus, startStream };
}
