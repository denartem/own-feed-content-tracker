import { preserveFocus } from './dom.js';

let active = null;

export function openDialog(app, render) {
  const dlg = document.getElementById('dialog');
  active?.dispose();
  const controller = new AbortController();
  const rerender = () => preserveFocus(() => render(dlg));
  const unsubscribe = app ? app.subscribe(rerender) : () => {};
  const handle = {
    dispose() {
      controller.abort();
      unsubscribe();
      if (active === handle) active = null;
    },
  };
  active = handle;
  // Прибирання синхронне: подія close приходить асинхронно й у прихованій вкладці може запізнюватись.
  const finish = () => {
    handle.dispose();
    dlg.replaceChildren();
  };
  dlg.addEventListener('cancel', finish, { signal: controller.signal });
  dlg.addEventListener('close', finish, { signal: controller.signal });
  render(dlg);
  if (!dlg.open) dlg.showModal();
  return {
    rerender,
    close: () => {
      finish();
      if (dlg.open) dlg.close();
    },
  };
}
