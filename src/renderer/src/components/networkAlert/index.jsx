import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../contexts/app';
import { Dialog } from '@mui/material';
import "./styles.css"
import WifiOffIcon from '@mui/icons-material/WifiOff';
const NetworkAlert = () => {

    const { alert } = useContext(AppContext);
    const [ offline, setOffline ] = useState(false);

    useEffect(() => {
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        }
    },[])

    const handleOnline = () => {
        setOffline(false);
        alert.toggle({
            show: true,
            title: 'You are back Online',
            type: 'success'
        })
    };

    const handleOffline = () => {
        setOffline(true);
    }

  return (
    !window.navigator.onLine &&
    <Dialog open>
        <div className='network-alert-container'>
            <WifiOffIcon className='network-icon'/>
            <h2>You are Disconnected !</h2>
            <p>Please check your network internet connection</p>
        </div>
    </Dialog>
  )
}

export default NetworkAlert