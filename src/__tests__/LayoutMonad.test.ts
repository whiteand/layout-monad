import { LayoutMonad } from '..'

describe('monadFactory', () => {
  test('Is a function', () => {
    expect(typeof LayoutMonad).toBe('function')
  })
  test('Is a constructor', () => {
    const simpleLayout = new LayoutMonad({ mobile: () => 1, desktop: () => 2 })
    expect(simpleLayout).toBeInstanceOf(LayoutMonad)
    expect(simpleLayout.getDict()).toEqual({
      mobile: 1,
      desktop: 2,
    })
  })
  test('Static of', () => {
    const allOnes = LayoutMonad.of(['mobile', 'desktop'], 1)
    expect(allOnes.getDict()).toEqual({
      mobile: 1,
      desktop: 1,
    })
  })
  test('static fromLayouts', () => {
    const layoutNames = LayoutMonad.fromLayouts(['mobile', 'desktop'], (layout) => layout)
    expect(layoutNames.getDict()).toEqual({
      mobile: 'mobile',
      desktop: 'desktop',
    })
  })
  test('static fromDict', () => {
    const initialDict = {
      mobile: 12,
      desktop: 32,
    }
    const layout = LayoutMonad.fromDict(initialDict)
    expect(layout.getDict()).toEqual(initialDict)
  })
  test('getValue', () => {
    const mobileFunc = jest.fn(() => 1)
    const desktopFunc = jest.fn(() => 2)
    const lazyDict = {
      mobile: mobileFunc,
      desktop: desktopFunc,
    }
    const layout = new LayoutMonad(lazyDict)
    expect(layout.getValue('mobile')).toEqual(1)
    expect(mobileFunc).toBeCalledTimes(1)
    expect(layout.getValue('mobile')).toEqual(1)
    expect(mobileFunc).toBeCalledTimes(1)
    expect(desktopFunc).toBeCalledTimes(0)
  })
  test('map', () => {
    const layout = LayoutMonad.fromDict({
      mobile: 1,
      desktop: 2,
    })
    expect(layout.map((x) => x * 10).getDict()).toEqual({
      mobile: 10,
      desktop: 20,
    })
  })
  test('apply', () => {
    const layout = LayoutMonad.fromDict({
      mobile: 1,
      desktop: 2,
    })
    expect(
      layout
        .apply(
          LayoutMonad.fromDict({
            mobile: (x) => x * 10,
            desktop: (y) => y / 2,
          }),
        )
        .getDict(),
    ).toEqual({
      mobile: 10,
      desktop: 1,
    })
  })
  test('or', () => {
    const layout = LayoutMonad.fromDict({
      mobile: null,
      desktop: 10,
    }).or(
      LayoutMonad.fromDict({
        mobile: 23,
        desktop: 12,
      }),
    )
    expect(layout.getDict()).toEqual({
      mobile: 23,
      desktop: 10,
    })
  })
  test('chain', () => {
    const frame = LayoutMonad.fromDict({
      mobile: 20,
      desktop: 10,
    })
    const nextFrame = frame.chain((value) =>
      value > 10
        ? LayoutMonad.fromDict({ mobile: 'greater', desktop: 'greater' })
        : LayoutMonad.fromDict({ mobile: 'less', desktop: 'less' }),
    )

    expect(nextFrame.getDict()).toEqual({
      mobile: 'greater',
      desktop: 'less',
    })
  })
  test('mapLayouts dict argument', () => {
    const layout = LayoutMonad.fromDict({
      mobileDesign: 123,
      desktopDesign: 512,
    })
    const newLayout = layout.mapLayouts({
      mobileDesign: ['mobile', 'tablet'],
      desktopDesign: ['laptop', 'desktop'],
    })
    expect(newLayout.getDict()).toEqual({
      mobile: 123,
      tablet: 123,
      laptop: 512,
      desktop: 512,
    })
  })
  test('mapLayouts func argument', () => {
    const layout = LayoutMonad.fromDict({
      mobileDesign: 123,
      desktopDesign: 512,
    })
    const newNames = {
      mobileDesign: ['mobile', 'tablet'],
      desktopDesign: 'laptop',
    }
    const newLayout = layout.mapLayouts((oldLayout) => newNames[oldLayout])
    expect(newLayout.getDict()).toEqual({
      mobile: 123,
      tablet: 123,
      laptop: 512,
    })
  })
  test('mapLayouts func argument', () => {
    const layout = LayoutMonad.fromDict({
      mobileDesign: 123,
      desktopDesign: 512,
    })
    const newNames = {
      mobileDesign: ['mobile', 'tablet'],
      desktopDesign: 'mobile',
    }
    const newLayout = layout.mapLayouts((oldLayout) => newNames[oldLayout])
    expect(newLayout.getDict()).toEqual({
      mobile: 123,
      tablet: 123,
    })
  })
  test('mapLayouts func argument', () => {
    const layout = LayoutMonad.fromDict({
      mobileDesign: 123,
      desktopDesign: 512,
    })
    const newNames = {
      mobileDesign: ['mobile', 'tablet'],
      desktopDesign: ['mobile', 'mobile'],
    }
    const newLayout = layout.mapLayouts((oldLayout) => newNames[oldLayout])
    expect(newLayout.getDict()).toEqual({
      mobile: 123,
      tablet: 123,
    })
  })
})
