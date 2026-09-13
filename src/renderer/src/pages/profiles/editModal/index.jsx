import { CircularProgress, Dialog } from '@mui/material'
import React, { useState, useEffect } from 'react'
import "./styles.css"
import { Close, Visibility } from '@mui/icons-material'
import { AES, enc } from 'crypto-js'
import { loginData } from '../../../constants/login'
import { convertToHttp } from '../../../helpers/methods/isUrl'

const EditModal = ({ open, defaultPlaylist, onClose, onEdit }) => {

    const [playlistName, setPlaylistName] = useState(defaultPlaylist ? defaultPlaylist : '');
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [serverUrl, setServerUrl] = useState("");
    const [passwordShow, setPasswordShow] = useState(false);

    useEffect(() => {
        setPlaylistName('');
        if(defaultPlaylist){
            setPlaylistName(Object.keys(defaultPlaylist)[0]);
            const { username, password, portallink } = Object.values(defaultPlaylist)[0];
            const decryptedPassword = AES.decrypt( password, "thisispassword" ).toString(enc.Utf8);
            const decryptedServerAddress = AES.decrypt( portallink, "thisisserveraddress" ).toString(enc.Utf8);
            setUsername(username);
            setPassword(decryptedPassword);
            setServerUrl(decryptedServerAddress);
        }
    },[defaultPlaylist]);

    const handleChange = (e, setFn) => {
        const value = e.target.value;
        setFn(value);
    }
    const { inputs } = loginData; 
    const { Password } = inputs; 

    const handleSave = (e) => {
        e.preventDefault();
        const ecryptedPassword = AES.encrypt( password, 'thisispassword' ).toString();
        const encryptedServerAddress = AES.encrypt( convertToHttp(serverUrl), "thisisserveraddress").toString();
        const details = {
            username, 
            playlistName,
            password: ecryptedPassword,
            portallink: encryptedServerAddress
        }

        onEdit(details)
    }

    return (
        <Dialog
            sx={{
                background: 'rgba(0,0,0,0.6)'
            }}
            PaperProps={{ className: 'edit-modal-container'}}
            open={open}
        >
            <div className="heading" ><p>
                    Edit Playlist
                </p>
                </div>
            <div className="login">
                
                <form className="loginForm" style={{ width: '100%' }}>
                    <div className="formGroup">
                        {inputs.playlistName.icon}
                        <input value={playlistName} onChange={(e) => handleChange(e, setPlaylistName)} className="formControl" placeholder="Playlist Name" type="text" />
                    </div>
                    <div className="formGroup">
                        {inputs.username.icon}
                        <input  value={username} onChange={(e) => handleChange(e, setUsername)} className="formControl" placeholder="Username" type="text" />
                    </div>
                    <div className="formGroup">

                        {passwordShow ? <Visibility className="showPassword" onClick={() => setPasswordShow(!passwordShow)} /> :
                            <Password.icon onClick={() => setPasswordShow(!passwordShow)} />
                        }
                        {loginData.inputs.Password.icon2}
                        <input  value={password} onChange={(e) => handleChange(e, setPassword)} className="formControl" placeholder="Password" type={passwordShow ? "text" : "password"} />
                    </div>

                    {/* <div className="formGroup">
                        {inputs.server.icon}
                        <input  value={serverUrl} onChange={(e) => handleChange(e, setServerUrl)} className="formControl" placeholder="Server Address" type="text" />
                    </div> */}
                </form>
            
                <div className="btns" >
                    <button onClick={handleSave}>Save</button>
                    <button onClick={onClose}>Cancel</button>
                </div>


            </div>
        </Dialog>
    )
}

export default EditModal