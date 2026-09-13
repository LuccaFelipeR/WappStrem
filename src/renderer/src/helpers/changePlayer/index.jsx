import "./styles.css";
import { Dialog, FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { useState,  useContext, useEffect } from "react"
import { AppContext } from "../../contexts/app";

const ChangePlayer = ({ open, close, completed, action, noEscape }) => {

    const [currentPlayer, setCurrentPlayer] = useState('flowplayer')
    const { currentPlayer: player, alert } = useContext(AppContext);

    const muiStyles = {
        margin: '5px',
        'span': {
            // color: 'white'
        },
        ".MuiFormControlLabel-label": {
            color:'white',
            fontWeight: 500,
            fontSize: 18
        }
    };

    useEffect(() => {
        if(player){
            setCurrentPlayer(player.player)
        }
    },[player])

    const handleChange = e => {
        const {value} = e.target;
        setCurrentPlayer(value);
        
    };

    const handleSave = () => {
        player.toggle(currentPlayer)
        localStorage.setItem('player', currentPlayer);
        alert.toggle({
            show: true,
            type: 'success',
            title: `Player Changed to ${currentPlayer === 'videojs'? 'Video JS': 'Flowplayer'}`
        })
        close();
    }

    return <Dialog sx={{
        background: 'rgba(0,0,0,0.6)',
        zIndex: 999999
    }} open={open} onClose={noEscape ? () => { } : close}>
        <div className="enter-parental-lock-containerr">
            {/* <Close className="close-icon"/> */}
            <div className="heading" ><p>
                Change Player
            </p></div>
            <br />
            <div className="players">
                <FormControl>
                    <RadioGroup
                    onChange={handleChange}
                        aria-labelledby="demo-radio-buttons-group-label"
                        defaultValue={currentPlayer}
                        name="radio-buttons-group"  
                    >
                        <FormControlLabel sx={muiStyles} value="videojs" control={<Radio />} label="Video JS" />
                        <FormControlLabel sx={muiStyles} value="flowplayer" control={<Radio />} label="Flowplayer" />
                    </RadioGroup>
                </FormControl>
            </div>

            {
                // loading ?
                //     <CircularProgress sx={{ mt: 5 }} /> :


                <div className="btns" >
                    <button onClick={handleSave} className="btn btn-primary playBtn">Save</button>
                    <button onClick={close} className="btn btn-primary ">Cancel</button>
                </div>


            }


        </div>
    </Dialog>
}

export default ChangePlayer;