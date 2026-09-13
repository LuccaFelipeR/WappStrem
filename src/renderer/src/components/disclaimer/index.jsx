import React, { useEffect, useState } from 'react'
import { disclaimerPoints } from '../../constants/disclaimer'
import { Dialog } from '@mui/material'
import "./styles.css"
// import { ipcRenderer } from 'electron'

const Disclaimer = () => {

    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (localStorage.getItem("termsAgreed") === 'true'){
            setShowModal(false)
        }else{
            setShowModal(true);
        }
    },[])

    const handleAccept = () => {
        localStorage.setItem("termsAgreed", 'true');
        setShowModal(false);
    }

    const handleCancel = () => {
        setShowModal(true);
        window.close();
        localStorage.setItem("termsAgreed", 'false');
    }

  return (
    <Dialog PaperProps={  { className: 'disclaimer-container-paper' ,sx: { minWidth: "95%",} }} open={showModal}>
    <div className="disclaimer-container">
      <h1 className='title'>YOU HEREBY AGREE TO TERMS HERE OTHERWISE DO NOT USE THE APP</h1>
      <ul className='list-container'>
        {disclaimerPoints.slice(0,6).map((point) => {
          return <li>{point}</li>
        })}
      </ul>
      <ul className='list-container'>
        <h2>Disclaimer</h2>
        {disclaimerPoints.slice(6,10).map((point) => {
          return <li>{point}</li>
        })}
      </ul>
      <div className='disclaimer-btns-container'>
        <button onClick={handleAccept}>ACCEPT</button>
        <button onClick={handleCancel}>CANCEL</button>
      </div>
    </div>
    </Dialog>
  )
}

export default Disclaimer