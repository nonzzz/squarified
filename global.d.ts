// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

type AnyObject = Record<keyof Any, Any>

type NonNull = NonNullable<unknown>
