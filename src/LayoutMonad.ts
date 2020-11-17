type Lazy<T> = () => T

type LayoutDict<Layout extends string, T> = {
  [k in Layout]: T
}

function buildDict<Layout extends string, X>(
  layouts: Layout[],
  f: (layout: Layout, layoutIndex: number) => X,
): LayoutDict<Layout, X> {
  const dict: any = Object.create(null)
  for (let i = 0; i < layouts.length; i++) {
    const layout = layouts[i]
    dict[layout] = f(layout, i)
  }
  return dict as LayoutDict<Layout, X>
}

export class LayoutMonad<Layout extends string, T> {
  private readonly lazyDict: LayoutDict<Layout, Lazy<T> | T>
  private readonly layouts: Layout[]
  private readonly isCalculated: LayoutDict<Layout, boolean>
  public constructor(lazyDict: LayoutDict<Layout, Lazy<T>>, layouts?: Layout[]) {
    this.layouts = layouts || (Object.keys(lazyDict) as Layout[])
    this.lazyDict = lazyDict
    this.isCalculated = buildDict(this.layouts, () => false)
  }

  private buildDict<X>(f: (layout: Layout) => X): LayoutDict<Layout, X> {
    return buildDict(this.layouts, f)
  }

  public static of<Layout extends string, T>(layouts: Layout[], value: T): LayoutMonad<Layout, T> {
    return new LayoutMonad<Layout, T>(
      buildDict(layouts, () => () => value),
      layouts,
    )
  }

  public static fromLayouts<Layout extends string, T>(
    layouts: Layout[],
    f: (layout: Layout) => T,
  ): LayoutMonad<Layout, T> {
    return new LayoutMonad<Layout, T>(
      buildDict(layouts, (layout) => () => f(layout)),
      layouts,
    )
  }

  public static fromDict<Layout extends string, T>(dict: LayoutDict<Layout, T>): LayoutMonad<Layout, T> {
    const layouts = Object.keys(dict) as Layout[]
    return new LayoutMonad<Layout, T>(
      buildDict(layouts, (layout) => () => dict[layout]),
      layouts,
    )
  }
  public getValue(layout: Layout): T {
    if (this.isCalculated[layout]) {
      return this.lazyDict[layout] as T
    }
    const lazy = this.lazyDict[layout] as Lazy<T>
    const value = lazy()
    this.lazyDict[layout] = value
    this.isCalculated[layout] = true
    return value
  }

  public map<U>(f: (value: T) => U): LayoutMonad<Layout, U> {
    return new LayoutMonad<Layout, U>(
      this.buildDict((layout) => {
        return () => {
          const v = this.getValue(layout)
          return f(v)
        }
      }),
      this.layouts,
    )
  }
  public apply<U>(funcsMonad: LayoutMonad<Layout, (value: T) => U>): LayoutMonad<Layout, U> {
    return new LayoutMonad<Layout, U>(
      this.buildDict((layout) => () => {
        const v = this.getValue(layout)
        const f = funcsMonad.getValue(layout)
        return f(v)
      }),
      this.layouts,
    )
  }

  public or<U, Res extends U | T = U | T>(anotherMonad: LayoutMonad<Layout, U>): LayoutMonad<Layout, Res> {
    return new LayoutMonad<Layout, Res>(
      this.buildDict((layout) => () => {
        const curV = this.getValue(layout)
        if (curV != null) return curV as Res
        const anotherV = anotherMonad.getValue(layout)
        return anotherV as Res
      }),
      this.layouts,
    )
  }

  public getDict(): LayoutDict<Layout, T> {
    return this.buildDict((layout) => this.getValue(layout))
  }

  public chain<U>(func: (value: T) => LayoutMonad<Layout, U>): LayoutMonad<Layout, U> {
    return new LayoutMonad<Layout, U>(
      this.buildDict((layout) => () => {
        const v = this.getValue(layout)
        const nextMonad = func(v)
        return nextMonad.getValue(layout)
      }),
      this.layouts,
    )
  }

  public mapLayouts<NewLayout extends string>(
    getNewLayoutOrNewLayoutDict:
      | ((oldLayout: Layout) => NewLayout | NewLayout[])
      | Record<Layout, NewLayout | NewLayout[]>,
  ): LayoutMonad<NewLayout, T> {
    const newLayouts: NewLayout[] = []
    const oldFromNew: any = Object.create(null)
    const getNewLayout =
      typeof getNewLayoutOrNewLayoutDict === 'function'
        ? getNewLayoutOrNewLayoutDict
        : (oldLayout: Layout) => getNewLayoutOrNewLayoutDict[oldLayout]

    for (let i = 0; i < this.layouts.length; i++) {
      const oldLayout = this.layouts[i]
      const newLayout = getNewLayout(oldLayout)

      if (Array.isArray(newLayout)) {
        for (let i = 0; i < newLayout.length; i++) {
          const newLayoutItem = newLayout[i]
          if (typeof oldFromNew[newLayoutItem] === 'undefined') {
            oldFromNew[newLayoutItem] = oldLayout
            newLayouts.push(newLayoutItem)
          }
        }
        continue
      }

      if (typeof oldFromNew[newLayout] === 'undefined') {
        oldFromNew[newLayout] = oldLayout
        newLayouts.push(newLayout)
      }
    }

    return new LayoutMonad<NewLayout, T>(
      buildDict(newLayouts, (newLayout) => () => {
        const oldLayout = oldFromNew[newLayout]
        const v = this.getValue(oldLayout)
        return v
      }),
      newLayouts,
    )
  }
}
