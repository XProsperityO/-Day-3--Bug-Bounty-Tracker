describe('OpenAPI spec contract', () => {
  it('should serve OpenAPI JSON', async () => {
    const mod = await import('../src/index');
    const server = await mod.buildServer();
    let data: any = null;
    // prefer programmatic access if the swagger plugin exposes a helper
    if (typeof (server as any).swagger === 'function') {
      if (typeof (server as any).ready === 'function') await (server as any).ready();
      data = (server as any).swagger();
    } else {
      // try common endpoints if swagger() not exposed
      const tries = ['/docs/openapi.json', '/documentation/json', '/documentation/json?yaml=false'];
      for (const url of tries) {
        const res = await server.inject({ method: 'GET', url });
        if (res.statusCode === 200) { data = res.json(); break; }
      }
    }
    expect(data).toBeTruthy();
  // allow any 3.0.x patch level (plugin may return 3.0.3)
  expect(typeof data.openapi === 'string' && /^3\.0\./.test(data.openapi)).toBe(true);
    expect(data.info.title).toMatch(/Bug Bounty Tracker/);
    if (typeof server.close === 'function') await server.close();
  });
});
