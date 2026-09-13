import { Box, Dialog, Grow } from "@mui/material"
import PersonOffIcon from '@mui/icons-material/PersonOff'; import "./styles.css"
import "./styles.css"

const DeleteModal = ({ deleteProfile, open, onClose }) => {
    return open && <Dialog open> <Grow className='invalid-user-popupp' in={open} >
            <Box display="flex" flexDirection="column" alignItems="center">
                <PersonOffIcon className='cross-icon' color='error' />
                <p className='invalid-title'>Are you sure to delete this profile ?</p>
                <div className="action-btns">
                    <button onClick={deleteProfile} className='ok-btn'>Yes</button>
                    <button onClick={onClose} className='ok-btn'>No</button>
                </div>
            </Box>
        </Grow>
    </Dialog>
}

export default DeleteModal;