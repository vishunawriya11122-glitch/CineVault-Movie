import { useState, useEffect, useCallback } from 'react';
import { APP_CONFIG } from '../config';

export interface GitHubAsset {
  name: string;
  downloadUrl: string;
  size: number;
}

export interface GitHubRelease {
  tagName: string;
  version: string;
  body: string;
  publishedAt: string;
  downloadUrl: string;
  assets: GitHubAsset[];
}

interface ReleaseState {
  releases: GitHubRelease[];
  latest: GitHubRelease | null;
  loading: boolean;
  error: string | null;
}

export function useGitHubRelease(): ReleaseState {
  const [state, setState] = useState<ReleaseState>({
    releases: [],
    latest: null,
    loading: true,
    error: null,
  });

  const fetchReleases = useCallback(async () => {
    try {
      const { owner, repo } = APP_CONFIG.github;
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/releases`,
        { headers: { Accept: 'application/vnd.github.v3+json' } },
      );

      if (!res.ok) {
        if (res.status === 403) throw new Error('Rate limited');
        throw new Error(`GitHub API error: ${res.status}`);
      }

      const data = await res.json();

      const releases: GitHubRelease[] = data.map((r: any) => {
        const apkAsset = r.assets?.find(
          (a: any) => a.name.endsWith('.apk'),
        );
        return {
          tagName: r.tag_name,
          version: r.tag_name.replace(/^v/, ''),
          body: r.body || '',
          publishedAt: r.published_at,
          downloadUrl: apkAsset?.browser_download_url || '',
          assets: (r.assets || []).map((a: any) => ({
            name: a.name,
            downloadUrl: a.browser_download_url,
            size: a.size,
          })),
        };
      });

      setState({
        releases,
        latest: releases[0] || null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  useEffect(() => {
    fetchReleases();
    // Re-check every 5 minutes for new releases
    const interval = setInterval(fetchReleases, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchReleases]);

  return state;
}
