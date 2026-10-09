import { useEffect, useRef } from 'react';
import { authService } from '../services/authService';

function buildWsUrl() {
  // eslint-disable-next-line no-undef
  const backendUrl = typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : import.meta.env.VITE_API_URL;

  if (backendUrl) {
    try {
      const urlObj = new URL(backendUrl);
      const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${urlObj.host}?token=${authService.getToken()}`;
    } catch (e) {
      console.error('Invalid backend URL', e);
    }
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isDev =
    window.location.port === '5173' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const signalingHost = isDev ? `${window.location.hostname}:3001` : window.location.host;
  return `${protocol}//${signalingHost}?token=${authService.getToken()}`;
}

/**
 * Lightweight WebSocket for link-based sessions (connect page).
 */
export function useSignalingSocket(onMessage) {
  const wsRef = useRef(null);
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!authService.getToken()) return undefined;

    let socket = null;
    let mounted = true;
    let reconnectTimer = null;
    let attempts = 0;

    const connect = () => {
      if (!mounted) return;
      socket = new WebSocket(buildWsUrl());
      wsRef.current = socket;

      socket.onopen = () => {
        attempts = 0;
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handlerRef.current?.(msg, socket);
        } catch {
          /* ignore */
        }
      };

      socket.onclose = () => {
        if (!mounted) return;
        const delay = Math.min(1000 * 2 ** attempts, 10000);
        attempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      wsRef.current = null;
    };
  }, []);

  return wsRef;
}
