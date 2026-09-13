import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import "./styles.css"

export const NavigateBack = () => {
    const [isFirstPage, setIsFirstPage] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const isApply = pathname === '/';

    const handleNavigateBack = () => {
        if ( pathname === '/playlists' ){
            navigate("/?action=add-profile")
        } else {
            navigate(-1)
        }
    }

    return (
        !isApply &&
        <ArrowBackIcon className='navigate-back-icon' onClick={handleNavigateBack} sx={{ fontSize: "35px", padding: '2px' }} />

    )
}
