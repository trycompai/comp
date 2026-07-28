export function showDialog(html: string): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const close = (confirmed: boolean): void => {
      container.remove();
      resolve(confirmed);
    };

    container
      .querySelector('[data-dialog="cancel"]')
      ?.addEventListener('click', () => close(false));
    container
      .querySelector('[data-dialog="confirm"]')
      ?.addEventListener('click', () => close(true));
  });
}
