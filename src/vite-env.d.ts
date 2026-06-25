/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API. Vazio = mesma origem (servidor único). */
  readonly VITE_API_URL?: string
}
