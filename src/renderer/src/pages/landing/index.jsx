import React, { useContext, useEffect } from 'react'
import "../../css/main.css"
import "../../css/token.css"
import "../../css/theme.css"
import { createSearchParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { playlistIcons } from "../../constants/index.jsx"
import { getUser } from '../../helpers/local/index.js';
import { AppContext } from '../../contexts/app.js';
import ViewListIcon from '@mui/icons-material/ViewList';
import "./styles.css"

const Landing = () => {
    const router = useNavigate();
    const { alert } = useContext(AppContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const pathname = searchParams.get("action")

    const userExists = getUser() && getUser().length > 0 && !(pathname === "add-profile");

    useEffect(() => {
        if (userExists) {
            router('/playlists')
        } else {
            router(loginQuery("player-api"))
        }
    }, []);

    const loginQuery = (type) => ({
        pathname: '/login',
        search: `?${createSearchParams(pathname === 'add-profile' ?
            {
                action: 'add-profile',
                type
            } :
            {
                type
            })}`
    });

    const handleListPlaylist = () => {
        const list = localStorage.getItem("listUser") ? JSON.parse(localStorage.getItem("listUser")).length > 0: null ;
        if (!list){
            alert.toggle({
                show: true,
                title: "No Playlist Found !",
                type: "warning"
            })
        }
    }

    return (
        <section className="splash" >
            {/* {playlistIcons.logo}
            <div className="playList">
                <Link to={loginQuery('one-stream-panel')}>
                    <span className="thumb">{playlistIcons.m3u}</span>
                    <span>1 STREAM PANEL</span>
                    <p>( API Based )</p>
                </Link>
                <Link to={loginQuery('player-api')}>
                    <span className="thumb">{playlistIcons.player}</span>
                    <span>PLAYER API</span>
                    <p>( Xtream Codes API )</p>
                </Link>
                <Link to="/login/m3u">
                    <span className="thumb">{playlistIcons.stalker}</span>
                    <span>M3U PORTAL</span>
                    <p>( M3U File & URL )</p>
                </Link>
            </div>
            <Link to="/playlists" onClick={handleListPlaylist} className='list-playlists'>
            <ViewListIcon fontSize="large" className='icon'/>
                    <p>List Playlists</p>
                </Link>
            <p className='terms-and-conditions'>Username/Password and Server Url Or M3U File / URL are provided by TV Service Providers.
                By using this web application</p> */}
        </section>
    )
}

export default Landing