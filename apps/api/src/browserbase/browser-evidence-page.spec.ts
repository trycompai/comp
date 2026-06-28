import { selectEvidencePage } from './browser-evidence-page';

interface TestPage {
  closed: boolean;
  id: string;
  url(): string;
}

const page = ({
  closed = false,
  id,
  url,
}: {
  closed?: boolean;
  id: string;
  url: string;
}): TestPage => ({
  closed,
  id,
  url: () => url,
});

const isClosed = (testPage: TestPage) => testPage.closed;

describe('selectEvidencePage', () => {
  it('prefers the newest open same-host page over the original page', () => {
    const initialPage = page({
      id: 'initial',
      url: 'https://github.com/acme/start',
    });
    const newTab = page({
      id: 'new-tab',
      url: 'https://github.com/acme/evidence',
    });

    const selected = selectEvidencePage({
      pages: [initialPage, newTab],
      initialPage,
      targetUrl: 'https://github.com/acme/start',
      isClosed,
    });

    expect(selected).toBe(newTab);
  });

  it('returns null when every page is closed', () => {
    const initialPage = page({
      closed: true,
      id: 'initial',
      url: 'https://github.com/acme/start',
    });

    const selected = selectEvidencePage({
      pages: [initialPage],
      initialPage,
      targetUrl: 'https://github.com/acme/start',
      isClosed,
    });

    expect(selected).toBeNull();
  });
});
