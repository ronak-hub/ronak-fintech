import { useSyncExternalStore } from 'react';

/**
 * A custom hook that returns `true` only after the component has mounted on the client.
 * This is used to prevent React hydration errors by ensuring that the first render
 * on the client matches the server-rendered output. Any client-side-only logic
 * can then be run conditionally based on the return value of this hook.
 *
 * @returns {boolean} `true` if the component is mounted on the client, otherwise `false`.
 */
export const useIsClient = () => {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
};