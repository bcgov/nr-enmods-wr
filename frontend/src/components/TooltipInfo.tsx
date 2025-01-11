import React from 'react'
import { Info } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'

export default function TooltipInfo(props) {

    const {title} = props;
    

    return (
        <>
            <Tooltip title={title}>
                <IconButton>
                    <Info/>
                </IconButton>
            </Tooltip>
        </>
    )
}
