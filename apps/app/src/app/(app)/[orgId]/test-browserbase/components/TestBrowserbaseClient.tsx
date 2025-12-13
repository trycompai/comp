'use client';

import { apiClient } from '@/lib/api-client';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import { useState } from 'react';

// API response types
interface ContextResponse {
  contextId: string;
}

interface SessionResponse {
  sessionId: string;
  liveViewUrl: string;
}

interface AuthStatusResponse {
  isLoggedIn: boolean;
  username?: string;
}

interface ScreenshotResponse {
  success: boolean;
  screenshot?: string;
  error?: string;
  needsReauth?: boolean;
}

type Status =
  | 'idle'
  | 'creating-context'
  | 'session-active'
  | 'checking-auth'
  | 'authenticated'
  | 'taking-screenshot';

interface TestBrowserbaseClientProps {
  organizationId: string;
}

export function TestBrowserbaseClient({ organizationId }: TestBrowserbaseClientProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [contextId, setContextId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [repoInput, setRepoInput] = useState('');
  const [instruction, setInstruction] = useState(
    'Navigate to Settings, then click on Branches to view branch protection rules',
  );
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartAuth = async () => {
    try {
      setError(null);
      setStatus('creating-context');

      // Create a new context (or reuse existing one)
      let currentContextId = contextId;
      if (!currentContextId) {
        const res = await apiClient.post<ContextResponse>(
          '/v1/browserbase/context',
          {},
          organizationId,
        );
        if (res.error || !res.data) throw new Error(res.error || 'Failed to create context');
        currentContextId = res.data.contextId;
        setContextId(currentContextId);
      }

      // Create session with context
      const sessionRes = await apiClient.post<SessionResponse>(
        '/v1/browserbase/session',
        { contextId: currentContextId },
        organizationId,
      );
      if (sessionRes.error || !sessionRes.data) {
        throw new Error(sessionRes.error || 'Failed to create session');
      }
      setSessionId(sessionRes.data.sessionId);
      setLiveViewUrl(sessionRes.data.liveViewUrl);

      // Navigate to GitHub login
      const navRes = await apiClient.post<{ success: boolean; error?: string }>(
        '/v1/browserbase/github/navigate-to-login',
        { sessionId: sessionRes.data.sessionId },
        organizationId,
      );
      if (navRes.error || !navRes.data?.success) {
        throw new Error(navRes.error || navRes.data?.error || 'Failed to navigate to GitHub');
      }

      setStatus('session-active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start auth');
      setStatus('idle');
    }
  };

  const handleCheckAuth = async () => {
    if (!sessionId) return;

    try {
      setError(null);
      setStatus('checking-auth');

      const res = await apiClient.post<AuthStatusResponse>(
        '/v1/browserbase/github/check-auth',
        { sessionId },
        organizationId,
      );
      if (res.error || !res.data) throw new Error(res.error || 'Failed to check auth');

      if (res.data.isLoggedIn) {
        setGithubUsername(res.data.username || 'Unknown');
        // Close the auth session - we'll create a new one for screenshots
        await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
        setSessionId(null);
        setLiveViewUrl(null);
        setStatus('authenticated');
      } else {
        setError('Not logged in yet. Complete the login in the browser above.');
        setStatus('session-active');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check auth status');
      setStatus('session-active');
    }
  };

  const handleTakeScreenshot = async () => {
    if (!repoInput || !instruction) return;

    try {
      setError(null);
      setStatus('taking-screenshot');

      // Create a new session with the existing context (user is already logged in)
      if (!contextId) {
        throw new Error('No context available. Please authenticate first.');
      }

      // Step 1: Create session and show live view
      const sessionRes = await apiClient.post<SessionResponse>(
        '/v1/browserbase/session',
        { contextId },
        organizationId,
      );
      if (sessionRes.error || !sessionRes.data) {
        throw new Error(sessionRes.error || 'Failed to create session');
      }
      const newSessionId = sessionRes.data.sessionId;
      setSessionId(newSessionId);
      setLiveViewUrl(sessionRes.data.liveViewUrl);

      // Parse owner/repo
      const parts = repoInput.replace('https://github.com/', '').split('/');
      if (parts.length < 2) {
        throw new Error('Please enter a valid repo format: owner/repo');
      }
      const [owner, repo] = parts;

      // Step 2: Execute navigation and take screenshot (user can watch in live view)
      const result = await apiClient.post<ScreenshotResponse>(
        '/v1/browserbase/github/screenshot',
        { sessionId: newSessionId, owner, repo, instruction },
        organizationId,
      );

      // Close the screenshot session
      await apiClient.post(
        '/v1/browserbase/session/close',
        { sessionId: newSessionId },
        organizationId,
      );
      setSessionId(null);
      setLiveViewUrl(null);

      if (result.error || !result.data?.success) {
        // Check if re-authentication is needed
        if (result.data?.needsReauth) {
          setError('GitHub session expired. Please re-authenticate.');
          setGithubUsername(null);
          setStatus('idle'); // Go back to auth flow
          return;
        }
        throw new Error(result.error || result.data?.error || 'Failed to take screenshot');
      }

      setScreenshot(result.data.screenshot || null);
      setStatus('authenticated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take screenshot');
      // Clean up session on error
      if (sessionId) {
        try {
          await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
        } catch {
          // Ignore
        }
      }
      setSessionId(null);
      setLiveViewUrl(null);
      setStatus('authenticated');
    }
  };

  const handleCloseSession = async () => {
    if (sessionId) {
      try {
        await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
      } catch {
        // Ignore close errors
      }
    }
    setSessionId(null);
    setLiveViewUrl(null);
    setStatus('idle');
  };

  const handleReset = () => {
    handleCloseSession();
    setContextId(null);
    setGithubUsername(null);
    setScreenshot(null);
    setRepoInput('');
    setError(null);
    setStatus('idle');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Session Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={status === 'authenticated' ? 'default' : 'secondary'}>{status}</Badge>
            </div>
            {contextId && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Context:</span>
                <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                  {contextId.slice(0, 12)}...
                </code>
              </div>
            )}
            {githubUsername && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">GitHub:</span>
                <Badge variant="outline">{githubUsername}</Badge>
              </div>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Step 1: Start Auth */}
      {status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Start GitHub Authentication</CardTitle>
            <CardDescription>
              {contextId
                ? 'You have an existing context. Start a session to check if you are still logged in.'
                : 'Create a new Browserbase context and session to authenticate with GitHub.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartAuth}>
              {contextId ? 'Resume Session' : 'Start GitHub Auth'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Live View + Check Auth */}
      {(status === 'session-active' || status === 'checking-auth') && liveViewUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Complete Login</CardTitle>
            <CardDescription>
              Log in to GitHub in the browser below. Complete 2FA if required, then click
              &quot;Check Auth Status&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border">
              <iframe
                src={liveViewUrl}
                className="h-[600px] w-full"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allow="clipboard-read; clipboard-write"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCheckAuth} disabled={status === 'checking-auth'}>
                {status === 'checking-auth' ? 'Checking...' : 'Check Auth Status'}
              </Button>
              <Button variant="outline" onClick={handleCloseSession}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Take Screenshot */}
      {(status === 'authenticated' || status === 'taking-screenshot') && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Take Screenshot with AI Navigation</CardTitle>
            <CardDescription>
              Enter a repository and describe in natural language where to navigate.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="repo">Repository (owner/repo)</Label>
              <Input
                id="repo"
                placeholder="e.g., facebook/react"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                disabled={status === 'taking-screenshot'}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="instruction">Navigation Instruction</Label>
              <Textarea
                id="instruction"
                placeholder="Describe where to navigate..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={3}
                disabled={status === 'taking-screenshot'}
              />
              <p className="text-xs text-muted-foreground">
                Examples: &quot;Go to Settings → Branches&quot;, &quot;Navigate to repository
                rules&quot;, &quot;Open the security settings&quot;
              </p>
            </div>

            {/* Show Live View while agent is working */}
            {status === 'taking-screenshot' && liveViewUrl && (
              <div className="flex flex-col gap-2">
                <Label>AI Agent Working...</Label>
                <div className="overflow-hidden rounded-lg border">
                  <iframe
                    src={liveViewUrl}
                    className="h-[500px] w-full"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleTakeScreenshot}
                disabled={!repoInput || !instruction || status === 'taking-screenshot'}
              >
                {status === 'taking-screenshot'
                  ? 'Navigating & Taking Screenshot...'
                  : 'Take Screenshot'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={status === 'taking-screenshot'}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screenshot Result */}
      {screenshot && (
        <Card>
          <CardHeader>
            <CardTitle>Screenshot Result</CardTitle>
            <CardDescription>Screenshot of {repoInput}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <img
                src={`data:image/jpeg;base64,${screenshot}`}
                alt="GitHub settings screenshot"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
