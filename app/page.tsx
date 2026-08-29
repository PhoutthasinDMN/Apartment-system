'use client';

import { useSyncExternalStore } from 'react';
import { App } from '@/src/app';

const subscribe = () => () => undefined;

export default function Home() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return <main className="min-h-screen bg-slate-50" aria-hidden="true" />;
  return <App />;
}
