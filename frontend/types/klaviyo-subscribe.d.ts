/**
 * Ambient types for the `klaviyo-subscribe` package, which ships no type
 * declarations of its own. See node_modules/klaviyo-subscribe/index.js
 * for the runtime implementation this mirrors.
 */
declare module 'klaviyo-subscribe' {
  export function subscribe(
    listId: string,
    email: string
  ): Promise<{ success: boolean }>
}
