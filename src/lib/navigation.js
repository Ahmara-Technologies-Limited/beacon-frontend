import { useRouter } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';

// nextjs-toploader only auto-starts the progress bar on real <a>/<Link>
// clicks - it has no idea a route change is coming when navigation is
// triggered programmatically via router.push()/replace(), which is how
// this app navigates everywhere (Sidebar, Header, tab switches, row
// clicks). Without this, the loader was installed but effectively never
// fired. useAppNavigate() wraps useRouter() so every push/replace call
// also kicks the bar - the same monkey-patched history.pushState the
// library hooks into finishes it automatically once the route commits.
export function useAppNavigate() {
  const router = useRouter();
  const topLoader = useTopLoader();

  return {
    ...router,
    push: (href, options) => {
      topLoader.start();
      return router.push(href, options);
    },
    replace: (href, options) => {
      topLoader.start();
      return router.replace(href, options);
    },
  };
}
