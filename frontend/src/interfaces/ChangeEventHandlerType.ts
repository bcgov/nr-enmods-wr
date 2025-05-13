import type { ChangeEvent } from "react"

export default interface ChangeEventHandlerType
  extends ChangeEvent<HTMLInputElement> {
  value: any
  name: string
}
