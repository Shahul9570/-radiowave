import { useRef, useState, useCallback } from 'react';
import { useWS } from '../context/WSContext';

export function usePTT(targetId) {
  const { sendJSON, sendBytes, connected } = useWS();
  const [transmitting, setTransmitting] = useState(false);
  const [error,        setError]        = useState(null);

  const streamRef    = useRef(null);
  const audioCtxRef  = useRef(null);
  const processorRef = useRef(null);
  const sourceRef    = useRef(null);

  const startTransmit = useCallback(async () => {
    if (!targetId || !connected || transmitting) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;

      const ctx  = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current  = source;

      const proc = ctx.createScriptProcessor(2048, 1, 1);
      processorRef.current = proc;

      proc.onaudioprocess = (e) => {
        const f32 = e.inputBuffer.getChannelData(0);
        const i16 = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) {
          const s = Math.max(-1, Math.min(1, f32[i]));
          i16[i]  = s < 0 ? s * 32768 : s * 32767;
        }
        sendBytes(i16.buffer);
      };

      source.connect(proc);
      proc.connect(ctx.destination);
      sendJSON({ type: 'start_transmission', target_id: targetId });
      setTransmitting(true);
    } catch (err) {
      setError(err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone in browser settings.'
        : `Microphone error: ${err.message}`
      );
    }
  }, [targetId, connected, transmitting, sendJSON, sendBytes]);

  const stopTransmit = useCallback(() => {
    if (!transmitting) return;
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    } catch(_) {}
    processorRef.current = sourceRef.current = audioCtxRef.current = streamRef.current = null;
    sendJSON({ type: 'stop_transmission' });
    setTransmitting(false);
  }, [transmitting, sendJSON]);

  return { transmitting, error, startTransmit, stopTransmit };
}