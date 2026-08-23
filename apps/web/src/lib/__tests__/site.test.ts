import { getSiteUrl } from '../site';

describe('getSiteUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers an explicit NEXT_PUBLIC_SITE_URL over everything else', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.temur.app';
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'temur-web-abc123.vercel.app';

    expect(getSiteUrl()).toBe('https://www.temur.app');
  });

  it('uses the production domain on a production deployment with no override', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'temur-web.vercel.app';
    process.env.VERCEL_URL = 'temur-web-abc123.vercel.app';

    expect(getSiteUrl()).toBe('https://temur-web.vercel.app');
  });

  it('uses the deployment URL on a preview deployment', () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'temur-web-git-my-branch-team.vercel.app';

    expect(getSiteUrl()).toBe('https://temur-web-git-my-branch-team.vercel.app');
  });

  it('falls back to localhost outside of Vercel', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });
});
