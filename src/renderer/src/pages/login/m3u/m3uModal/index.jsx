import { Checkbox, Dialog, Typography } from '@mui/material'
import React, {useState, useEffect} from 'react'
import "./styles.css"
import { Error, WrongLocation } from '@mui/icons-material';

const M3uModal = ({onClose, open}) => {

    return (
        <Dialog open={open} onClose={onClose}>
            <div className='m3u-modal-container'>
                <Error sx={{fontSize : '50px', color : '#d61818'}}/>
               <Typography variant='h5' fontWeight={'bold'}>Invalid M3U Playlist !</Typography>
          <button onClick={onClose} className='ok-btn'>Try again</button>
               
            </div>
        </Dialog>
    )
}

export default M3uModal