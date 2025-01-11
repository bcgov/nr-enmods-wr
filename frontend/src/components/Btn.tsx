/* eslint-disable prettier/prettier */
import React from "react"
import Button from "@mui/material/Button"

export default function Btn(props) {
  const { text, size, type, sx, fullWidth, handleClick, disabled } = props

  return (
    <>
      <Button
        variant="contained"
        size={size}
        type={type}
        sx={sx}
        fullWidth={fullWidth}
        onClick={handleClick}
        disabled={disabled}
      >
        {text}
      </Button>
    </>
  )
}
