import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import eslintConfig from '../../eslint.config.js'

it('비활성 권장 규칙은 꺼져 있고 현재 린트 정책은 유지된다', async () => {
  const config = await new ESLint({
    overrideConfig: eslintConfig,
    overrideConfigFile: true,
  }).calculateConfigForFile('src/pages/IdeaDumpPage.jsx')

  expect(config.rules['jsx-a11y/label-has-for'][0]).toBe(0)
  expect(config.rules['jsx-a11y/control-has-associated-label'][0]).toBe(0)
  expect(config.rules['jsx-a11y/anchor-has-content'][0]).toBe(1)
  expect(config.rules['jsx-a11y/label-has-associated-control'][0]).toBe(2)
  expect(config.rules['jsx-a11y/label-has-associated-control'][1]).toEqual({ assert: 'either' })
  expect(config.rules['jsx-a11y/alt-text'][0]).toBe(2)
  expect(config.rules['jsx-a11y/click-events-have-key-events'][0]).toBe(2)
  expect(config.rules['jsx-a11y/no-static-element-interactions'][0]).toBe(2)
})
