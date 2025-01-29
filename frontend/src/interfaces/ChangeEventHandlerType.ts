export default interface ChangeEventHandlerType
  extends React.ChangeEvent<HTMLInputElement> {
  value: string | number | boolean
  name: string
}
