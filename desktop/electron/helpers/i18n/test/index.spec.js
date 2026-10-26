import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

vi.mock('$electron/helpers/store/index.js', () => ({
  default: { get: () => 'en-US', onDidChange: vi.fn() },
}))
vi.mock('$electron/configs/extra/index.js', () => ({
  localesDir: fileURLToPath(new URL('../../../resources/extra/common/locales', import.meta.url)),
}))

describe('packaged translation loading', () => {
  it('reads the real locale files and preserves message interpolation', async () => {
    const { default: i18n } = await import('../index.js')
    expect(i18n.t('connection.choose')).toBe('Choose a device')
    expect(i18n.t('connection.emptyTitle')).not.toBe('connection.emptyTitle')
    expect(i18n.t('common.batch.partial.success', { total: 3, success: 2, failed: 1 }))
      .toBe('Batch operation partially successful, 3 total, 2 succeeded, 1 failed')
    await i18n.changeLanguage('zh-CN')
    expect(i18n.t('connection.choose')).not.toBe('connection.choose')
    expect(i18n.t('connection.choose')).not.toBe('Choose a device')
  })
})
