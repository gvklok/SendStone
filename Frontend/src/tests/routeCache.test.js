// ============================================================
// Final Phase Tests — routeCache
// ============================================================

describe('routeCache — Final Phase', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getPrefetchedRoutes returns null before fetch resolves', () => {
    global.fetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { getPrefetchedRoutes } = require('../routeCache');
    expect(getPrefetchedRoutes()).toBeNull();
  });

  it('fetches the correct URL on import', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    require('../routeCache');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/routes?limit=12&page=1&sort=-send_count'
    );
  });

  it('populates cache after a successful fetch', async () => {
    const mockData = { items: [{ id: '1', name: 'Route A' }], total: 1 };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    const { getPrefetchedRoutes } = require('../routeCache');
    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    const cache = getPrefetchedRoutes();
    expect(cache).not.toBeNull();
    expect(cache.items).toHaveLength(1);
    expect(cache.total).toBe(1);
  });

  it('cache stays null after a failed fetch', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    const { getPrefetchedRoutes } = require('../routeCache');
    await new Promise((r) => setTimeout(r, 0));
    expect(getPrefetchedRoutes()).toBeNull();
  });

  it('cache stays null when server returns a non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    const { getPrefetchedRoutes } = require('../routeCache');
    await new Promise((r) => setTimeout(r, 0));
    expect(getPrefetchedRoutes()).toBeNull();
  });

  it('clearPrefetchedRoutes resets cache to null', async () => {
    const mockData = { items: [{ id: '1' }], total: 1 };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    const { getPrefetchedRoutes, clearPrefetchedRoutes } = require('../routeCache');
    await new Promise((r) => setTimeout(r, 0));
    clearPrefetchedRoutes();
    expect(getPrefetchedRoutes()).toBeNull();
  });

  it('only fires one fetch even if module is imported multiple times', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    const mod1 = require('../routeCache');
    const mod2 = require('../routeCache'); // same cached module
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
