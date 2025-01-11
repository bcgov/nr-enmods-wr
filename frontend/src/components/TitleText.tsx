import React from 'react'
import { Typography } from '@mui/material'

export default function TitleText(props) {
    const {variant, text, sx} = props;

    return (
        <>
            <Typography variant={variant} sx={sx}>{text}</Typography>
        </>
    )
}
