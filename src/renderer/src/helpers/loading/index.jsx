import { AppContext } from '../../contexts/app'
import { Backdrop, CircularProgress } from '@mui/material';
import React, { useContext } from 'react'
import "./style.css"

const Loading = () => {

    const { theme } = useContext(AppContext);
    const bg = theme.current === "light" ? "white" : "#131A2F";
    const loader = theme.current === "light" ? "#131A2F" : "white";

    return (
        <Backdrop className='backdrop-loader' open={true}>
            <CircularProgress sx={{ color: "white" }} />
        </Backdrop>
    )
}

export default Loading