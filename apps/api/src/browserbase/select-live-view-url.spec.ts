import { selectLiveViewUrl } from './browserbase-session.service';

const page = (url: string, tag: string) => ({
  url,
  debuggerFullscreenUrl: `live://${tag}`,
});

describe('selectLiveViewUrl', () => {
  const home = page('https://aws.amazon.com/', 'home');
  const signin = page('https://us-east-2.signin.aws.amazon.com/oauth', 'signin');
  const debug = { debuggerFullscreenUrl: 'live://session', pages: [home, signin] };

  it('follows the tab matching the AI page by exact URL', () => {
    expect(selectLiveViewUrl(debug, 'https://us-east-2.signin.aws.amazon.com/oauth')).toBe(
      'live://signin',
    );
  });

  it('matches by hostname when the exact URL has drifted (redirects)', () => {
    expect(
      selectLiveViewUrl(debug, 'https://us-east-2.signin.aws.amazon.com/console?x=1'),
    ).toBe('live://signin');
  });

  it('falls back to the newest tab when nothing matches', () => {
    expect(selectLiveViewUrl(debug, 'https://unrelated.example.com/')).toBe('live://signin');
  });

  it('uses the session-level view when there are no pages', () => {
    expect(selectLiveViewUrl({ debuggerFullscreenUrl: 'live://session', pages: [] })).toBe(
      'live://session',
    );
  });
});
