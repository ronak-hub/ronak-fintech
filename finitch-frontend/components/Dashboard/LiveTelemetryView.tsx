"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { getAuthToken } from '@/lib/cookies';

interface Transaction {
  id: number;
  amount: number;
  merchant: string;
  category: string;
  bank: string;
  timestamp: string;
  balance_remaining: number;
}

interface WebSocketMessage {
  type: 'transaction_update' | 'webhook_event' | 'system_alert' | 'heartbeat' | 'ack';
  data?: Transaction;
  event_type?: string;
  level?: string;
  message?: string;
  timestamp?: string;
}

export default function LiveTelemetryView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [systemAlerts, setSystemAlerts] = useState<string[]>([]);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<number>>(new Set());
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract user ID and token from localStorage
  const getUserContext = useCallback(() => {
    const token = getAuthToken();
    // In production, extract user_id from token JWT payload
    // For now, assuming user_id=1 (will be extracted from auth context)
    const userId = 1;
    return { token, userId };
  }, []);

  // Handle incoming transaction update
  function handleTransactionUpdate(transactionData: Transaction) {
    setTransactions((prev) => {
      // Check if transaction already exists
      const exists = prev.some((t) => t.id === transactionData.id);
      if (exists) return prev;

      // Add new transaction to the beginning
      return [transactionData, ...prev];
    });

    // Mark as new for animation
    setNewTransactionIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(transactionData.id);
      return newSet;
    });

    // Remove animation class after 3 seconds
    setTimeout(() => {
      setNewTransactionIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(transactionData.id);
        return newSet;
      });
    }, 3000);
  }

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    const { token, userId } = getUserContext();

    if (!token) {
      setSystemAlerts(['No authentication token found. Please login.']);
      return;
    }

    setConnectionStatus('connecting');

    const apiBase = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001');
    const wsProtocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${apiBase.host}/api/v1/ws/telemetry/${userId}?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        setIsConnected(true);
        setSystemAlerts([]);

        // Send initial heartbeat
        ws.send(JSON.stringify({ type: 'ping' }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'transaction_update':
              handleTransactionUpdate(message.data!);
              break;

            case 'webhook_event':
              if (message.event_type === 'sms_transaction') {
                handleTransactionUpdate(message.data!);
              }
              break;

            case 'system_alert':
              setSystemAlerts((prev) => [...prev, message.message || '']);
              break;

            case 'heartbeat':
              // Heartbeat received, connection is alive
              break;

            case 'ack':
              console.log('Message acknowledged by server');
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
        setIsConnected(false);
        setSystemAlerts(['WebSocket connection error occurred']);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setIsConnected(false);

        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
        }, 5000);
      };

      websocketRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    }
  }, [getUserContext]);

  // Setup WebSocket connection on component mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connectWebSocket();

    // Heartbeat interval to keep connection alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds

    return () => {
      // Cleanup on unmount
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [connectWebSocket]);

  const categoryColors: Record<string, string> = {
    'Food & Dining': 'text-vaultic-orange bg-vaultic-orange/10',
    'Shopping': 'text-vaultic-pink bg-vaultic-pink/10',
    'Transport & Fuel': 'text-vaultic-cyan bg-vaultic-cyan/10',
    'Bills & Utilities': 'text-vaultic-violet bg-vaultic-violet/10',
    'Entertainment': 'text-vaultic-cyan bg-vaultic-cyan/10',
    'Investment': 'text-vaultic-mint bg-vaultic-mint/10',
    'Personal Transfer': 'text-vaultic-muted bg-vaultic-slate/15',
    'Other': 'text-vaultic-muted bg-vaultic-slate/15',
  };

  return (
    <div className="vaultic-page p-4 sm:p-6 md:p-8 font-sans">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight uppercase mb-2">Live Telemetry</h1>
            <p className="text-vaultic-muted text-sm font-semibold">Real-time transaction stream via WebSocket</p>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-3 px-6 py-3 vaultic-panel rounded-2xl">
            {isConnected ? (
              <>
                <Wifi className="text-vaultic-mint animate-pulse" size={18} />
                <div>
                  <p className="text-vaultic-mint font-bold text-xs uppercase tracking-wider">Connected</p>
                  <p className="text-vaultic-muted text-[10px]">{connectionStatus}</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="text-vaultic-error animate-pulse" size={18} />
                <div>
                  <p className="text-vaultic-error font-bold text-xs uppercase tracking-wider">Disconnected</p>
                  <p className="text-vaultic-muted text-[10px]">{connectionStatus}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* System Alerts */}
        <AnimatePresence>
          {systemAlerts.map((alert, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-vaultic-error/10 border border-vaultic-error/30 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="text-vaultic-error" size={18} />
              <span className="text-vaultic-error/70 text-sm">{alert}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="vaultic-panel max-w-7xl mx-auto rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="border-b border-vaultic-border bg-vaultic-black/50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-bold text-vaultic-muted uppercase tracking-wider">Merchant</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-vaultic-muted uppercase tracking-wider">Category</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-vaultic-muted uppercase tracking-wider">Amount</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-vaultic-muted uppercase tracking-wider">Bank</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-vaultic-muted uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-vaultic-muted">
                      <RefreshCw className="mx-auto mb-2 opacity-50" size={24} />
                      <p>Waiting for transaction stream...</p>
                    </td>
                  </tr>
                ) : (
                    transactions.map((tx) => {
                    const isNew = newTransactionIds.has(tx.id);
                    return (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`border-t border-vaultic-border transition-all ${
                          isNew ? 'border-l-4 border-l-vaultic-mint shadow-[inset_-1px_0_0_rgba(var(--mint-rgb),0.3)]' : ''
                        }`}
                        style={isNew ? { animation: 'fadeGlow 3s ease-out' } : {}}
                      >
                        <td className="px-8 py-6 font-semibold text-vaultic-cream text-sm break-words">{tx.merchant}</td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex max-w-full px-3 py-1 rounded-full text-xs font-bold whitespace-normal ${categoryColors[tx.category] || 'bg-vaultic-slate/15'}`}>
                            {tx.category}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-black text-vaultic-orange text-lg">₹{tx.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-vaultic-muted text-sm">{tx.bank}</td>
                        <td className="px-8 py-6 text-vaultic-muted text-xs font-mono">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* CSS Animation for glowing border effect */}
      <style>{`
        @keyframes fadeGlow {
          0% {
            box-shadow: inset -4px 0 0 rgba(var(--mint-rgb), 0.6);
          }
          100% {
            box-shadow: inset -1px 0 0 rgba(var(--mint-rgb), 0);
          }
        }
      `}</style>
    </div>
  );
}
