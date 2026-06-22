// MathJax 3 global — loaded via /tex-svg.js (deferred, pre-compiled bundle)
declare global {
  interface Window {
    MathJax: {
      startup: { promise: Promise<void> };
      typesetClear: (elements?: Element[]) => void;
      typesetPromise: (elements?: Element[]) => Promise<void>;
    };
  }
}

let ready: Promise<void> | null = null;

function whenReady(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve, reject) => {
    const check = () => {
      const mj = window.MathJax;
      if (mj?.startup?.promise) {
        mj.startup.promise.then(resolve).catch(reject);
      } else {
        // tex-svg.js not yet executed — poll every 50 ms
        setTimeout(check, 50);
      }
    };
    check();
  });
  return ready;
}

export async function typesetMath(el: HTMLElement): Promise<void> {
  await whenReady();
  window.MathJax.typesetClear([el]);
  await window.MathJax.typesetPromise([el]);
}
