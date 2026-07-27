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

  it('follows a new tab the agent opened on a different host (AWS console vs sign-in)', () => {
    const initialPage = page({ id: 'home', url: 'https://aws.amazon.com/' });
    const iamTab = page({
      id: 'iam',
      url: 'https://console.aws.amazon.com/iam/home#/users',
    });

    const selected = selectEvidencePage({
      pages: [initialPage, iamTab],
      initialPage,
      // Entered host matches neither tab — the screenshot must still land on the
      // page the agent navigated to, not the stale homepage.
      targetUrl: 'https://us-east-2.signin.aws.amazon.com/',
      isClosed,
    });

    expect(selected).toBe(iamTab);
  });

  it('keeps the initial page when the agent navigated within it (no new tab)', () => {
    const initialPage = page({
      id: 'initial',
      url: 'https://console.aws.amazon.com/iam/home',
    });

    const selected = selectEvidencePage({
      pages: [initialPage],
      initialPage,
      targetUrl: 'https://us-east-2.signin.aws.amazon.com/',
      isClosed,
    });

    expect(selected).toBe(initialPage);
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
