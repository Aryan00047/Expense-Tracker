import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google';

console.log(
  'VITE_GOOGLE_CLIENT_ID =',
  import.meta.env.VITE_GOOGLE_CLIENT_ID
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
   <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
  </StrictMode>,
)
