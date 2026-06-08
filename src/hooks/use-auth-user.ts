"use client";

import type { User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

type AuthState = {
  loading: boolean;
  user: User | null;
};

let authState: AuthState = {
  loading: Boolean(supabase),
  user: null,
};
const serverAuthSnapshot: AuthState = {
  loading: Boolean(supabase),
  user: null,
};

const listeners = new Set<() => void>();
let authInitialized = false;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setAuthState(nextState: AuthState) {
  if (authState.loading === nextState.loading && authState.user?.id === nextState.user?.id) {
    return;
  }

  authState = nextState;
  emitChange();
}

function ensureAuthObserver() {
  if (authInitialized || !supabase) {
    return;
  }

  authInitialized = true;

  void supabase.auth.getSession().then(({ data }) => {
    setAuthState({
      loading: false,
      user: data.session?.user ?? null,
    });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    setAuthState({
      loading: false,
      user: session?.user ?? null,
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureAuthObserver();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  ensureAuthObserver();
  return authState;
}

function getServerSnapshot(): AuthState {
  return serverAuthSnapshot;
}

export function useAuthUser(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
