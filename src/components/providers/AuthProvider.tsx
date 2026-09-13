'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';

const defaultSession = {
  user: {
    id: 'demo-user-id',
    name: 'Alex Vance',
    email: 'student@aura.study',
    image: null,
  },
  expires: '2099-01-01T00:00:00.000Z',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider session={defaultSession}>{children}</SessionProvider>;
}

