import { useEffect } from 'react';

const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  'summary',
  'label[for]',
  'input[type="button"]:not(:disabled)',
  'input[type="submit"]:not(:disabled)',
  'input[type="reset"]:not(:disabled)',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
].join(', ');

const REACT_PROP_PREFIXES = ['__reactProps$', '__reactEventHandlers$'];

const hasReactClickHandler = (element: HTMLElement) => {
  const propKey = Object.keys(element).find((key) =>
    REACT_PROP_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );

  if (!propKey) return false;

  const props = (element as HTMLElement & Record<string, unknown>)[propKey] as Record<string, unknown> | undefined;
  if (!props) return false;

  return ['onClick', 'onDoubleClick', 'onMouseDown', 'onMouseUp', 'onPointerDown', 'onPointerUp'].some(
    (eventName) => typeof props[eventName] === 'function',
  );
};

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') ||
  element.getAttribute('aria-disabled') === 'true' ||
  element.classList.contains('cursor-not-allowed');

const shouldShowPointer = (element: HTMLElement) => {
  if (isDisabled(element)) return false;
  if (element.matches(INTERACTIVE_SELECTOR)) return true;
  return hasReactClickHandler(element);
};

const syncCursorState = (element: HTMLElement) => {
  if (shouldShowPointer(element)) {
    element.setAttribute('data-clickable-cursor', 'true');
  } else {
    element.removeAttribute('data-clickable-cursor');
  }
};

const syncTree = (root: ParentNode) => {
  if (root instanceof HTMLElement) {
    syncCursorState(root);
  }

  if ('querySelectorAll' in root) {
    root.querySelectorAll<HTMLElement>('*').forEach(syncCursorState);
  }
};

export default function ClickableCursorManager() {
  useEffect(() => {
    syncTree(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          syncCursorState(mutation.target);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            syncTree(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'disabled', 'aria-disabled', 'href', 'role', 'for'],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
