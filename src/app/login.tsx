import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Redirecionamento da rota legada /login para a raiz /,
 * onde o fluxo de autenticação é executado sem sufixo de rota na URL.
 */
export default function LoginRouteRedirect() {
  return <Redirect href="/" />;
}
