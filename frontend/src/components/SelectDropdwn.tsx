import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"

type Props = {
  title: string
  name: string
  value: any
  attributeName: string
  options: any
  handleOnChange: any
}

const SelectDropdwn = (props: Props) => {
  const { handleOnChange, options, attributeName, value, title, name } = props
  return (
    <>
      <FormControl sx={{ m: 0, minWidth: 220 }}>
        <InputLabel id="label-id">{title}</InputLabel>
        <Select
          labelId="label-id"
          label={title}
          name={name}
          value={value}
          onChange={handleOnChange}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {options &&
            options.map((item: any) => (
              <MenuItem key={item.id} value={item}>
                {item[attributeName]}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </>
  )
}

export default SelectDropdwn
