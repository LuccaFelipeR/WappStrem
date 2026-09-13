import React, { useState, useContext, useEffect } from 'react'
import "./styles.css"
import axios from 'axios';
import Carousel, { CarouselItem } from '../../helpers/carousel/login/index';
import { Alert, Backdrop, Box, Dialog, Fade, Grow, Slide } from '@mui/material';
// import { useRouter } from "next/router"
// import { useRouter as queryRouter } from "next/router"
import CloseIcon from '@mui/icons-material/Close';
import { AES, enc } from 'crypto-js'
import { AppContext } from '../../contexts/app';
import { ViewList, Visibility } from '@mui/icons-material';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../firebase';
import { v4 } from "uuid";
import Loading from '../../helpers/loading';
import { loginData } from '../../constants/login/index';
import { getUser } from '../../helpers/local';
import logoSmall from "../../assets/logoSmall.png"
import { getRandomHexColor } from '../../helpers/methods/getRandomColor';
import { getDbAddress } from '../../helpers/methods/getDbAddress';
import { migrateData } from '../../firebase/functions';
import { endpoint } from '../../config/endpoints';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import crossIcon from "../../assets/cross.png"
import logo from "../../assets/logo.png"


const Login = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const router = useNavigate();
    const action = searchParams.get("action");
    const type = searchParams.get("type");
    const { toggleUser, alert, streamData, homeM3uStreams, m3uStreams, dnsList } = useContext(AppContext);
    const [playlistName, setPlaylistName] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [serverAddress, setServerAddress] = useState("");
    const [passwordShow, setPasswordShow] = useState(false);
    const [errorModal, setErrorModal] = useState({
        message: "",
        show: false
    });
    const [loading, setLoading] = useState(false);
    const [handleLoginClicked, setHandleLoginClicked] = useState(false);
    const valuesNotFilled = [playlistName, password, username].filter(val => val.length === 0).length > 0;
    const { inputs } = loginData;
    const { Password } = inputs;

    useEffect(() => {
        if (getUser() && getUser().length > 0 && action !== 'add-profile') {
            router('/playlists')
        };
    }, []);

    useEffect(() => {
        if (dnsList.list && dnsList.list.length === 0) {
            setErrorModal({
                show: true,
                message: 'Your Account is Expired !',
                description: 'No DNS Found !'
            })
        }
    }, [dnsList.list])

    const convertToHttp = (url) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        } else {
            return 'http://' + url;
        }
    }

    const convertedUrl = convertToHttp(serverAddress);
    const encryptedPassword = AES.encrypt(password, "thisispassword").toString();
    const encryptedAddress = AES.encrypt(convertedUrl, "thisisserveraddress").toString();
    const dataToSend = {
        username,
        password,
    }
    const params = new URLSearchParams(dataToSend).toString();

    const loginUser = async () => {
        const { list } = dnsList
        const demo = [null];
        if (list && list.length > 0) {

            const final = (list && list.length > 0) ? list : demo;
            for (const url of final) {
                const uid = v4();
                const itemIndex = final.indexOf(url);
                const encryptedAddress = AES.encrypt(convertToHttp(url), "thisisserveraddress").toString();
                try {
                    if (type === "player-api") {
                        const response = await axios.get(`${convertToHttp(url)}/player_api.php?${params}`);
                        const { user_info, server_info, token } = response.data;
                        const serverInfo = AES.encrypt(JSON.stringify(server_info), "thisisserverinfo").toString();
                        const userInfo = AES.encrypt(JSON.stringify(user_info), "thisisuserinfo").toString();
                        const getTimeDifference = () => {
                            const encryptedTime = server_info.time_now;
                            const difference = new Date().getHours() - new Date(encryptedTime).getHours();
                            return difference;
                        };
                        const profileColor = getRandomHexColor();
                        if (user_info.auth === 1 && user_info.status === "Active") {
                            const credentials = {
                                [playlistName]: {
                                    id: uid,
                                    username,
                                    password: encryptedPassword,
                                    portallink: encryptedAddress,
                                    serverInfo,
                                    userInfo,
                                    timeDifference: getTimeDifference(),
                                    profileColor,
                                    loginType: type,
                                    token,
                                }
                            };
                            const user = {
                                id: uid,
                                username,
                                password: encryptedPassword,
                                serverPrefix: encryptedAddress,
                                server: encryptedAddress,
                                serverInfo,
                                userInfo,
                                timeDifference: getTimeDifference(),
                                profileColor,
                                loginType: type,
                                token,

                            };
                            const existingUsers = JSON.parse(localStorage.getItem("listUser"));
                            const updatedUsers = JSON.stringify(existingUsers ? [...existingUsers, credentials] : [credentials]);
                            localStorage.setItem("listUser", updatedUsers);
                            localStorage.setItem("currentUser", JSON.stringify(credentials));
                            localStorage.setItem('player', 'flowplayer')
                            toggleUser({
                                ...user,
                                dbAddress: getDbAddress(user, null),
                                decryptedDbAddress: getDbAddress(user, 'decrypted')
                            })
                            const { movies, series } = streamData;

                            movies.toggle(null, "streams")
                            movies.toggle(null, "categories")
                            series.toggle(null, "streams")
                            series.toggle(null, "categories");
                            m3uStreams.toggle(null, null, null);
                            homeM3uStreams.toggle(null);
                            movies.banner.toggle(null);
                            series.banner.toggle(null)

                            firebaseSignIn();
                            break;

                            // migrateData(getDbAddress(user, 'decrypted'), getDbAddress(user, null));

                        } else {
                            setErrorModal(
                                {
                                    message: "Authentication Failed !",
                                    description: "Your Account Status is " + user_info.status,
                                    show: true
                                }
                            );
                            setLoading(false)

                        }
                    }
                    else {
                        const response = await axios.post(`${convertToHttp(url)}/play/b2c/v1/auth`, {
                            username,
                            password,
                            server: convertToHttp(url),
                        });
                        const token = response?.data?.auth_token;
                        const resp = await axios.get(`${convertToHttp(url)}/play/b2c/v1/user-info?token=${token}`)
                        const { user_info, server_info } = resp.data;
                        const serverInfo = AES.encrypt(JSON.stringify(server_info), "thisisserverinfo").toString();
                        const userInfo = AES.encrypt(JSON.stringify(user_info), "thisisuserinfo").toString();
                        const getTimeDifference = () => {
                            const encryptedTime = server_info.time_now;
                            const difference = new Date().getHours() - new Date(encryptedTime).getHours();
                            return difference;
                        };
                        const profileColor = getRandomHexColor();
                        if (user_info.auth === 1 && user_info.status === "Active") {
                            const credentials = {
                                [playlistName]: {
                                    id: uid,
                                    username,
                                    password: encryptedPassword,
                                    portallink: encryptedAddress,
                                    serverInfo,
                                    userInfo,
                                    timeDifference: getTimeDifference(),
                                    profileColor,
                                    loginType: type,
                                    token,
                                }
                            };
                            const user = {
                                id: uid,
                                username,
                                password: encryptedPassword,
                                serverPrefix: encryptedAddress,
                                server: encryptedAddress,
                                serverInfo,
                                userInfo,
                                timeDifference: getTimeDifference(),
                                profileColor,
                                loginType: type,
                                token,

                            };
                            const existingUsers = JSON.parse(localStorage.getItem("listUser"));
                            const updatedUsers = JSON.stringify(existingUsers ? [...existingUsers, credentials] : [credentials]);
                            localStorage.setItem("listUser", updatedUsers);
                            localStorage.setItem("currentUser", JSON.stringify(credentials));
                            localStorage.setItem('player', 'flowplayer')
                            toggleUser({
                                ...user,
                                dbAddress: getDbAddress(user, null),
                                decryptedDbAddress: getDbAddress(user, 'decrypted')
                            })
                            const { movies, series } = streamData;

                            movies.toggle(null, "streams")
                            movies.toggle(null, "categories")
                            series.toggle(null, "streams")
                            series.toggle(null, "categories");
                            m3uStreams.toggle(null, null, null);
                            homeM3uStreams.toggle(null);
                            movies.banner.toggle(null);
                            series.banner.toggle(null)

                            firebaseSignIn();
                            break;
                            migrateData(getDbAddress(user, 'decrypted'), getDbAddress(user, null));

                        } else {
                            setErrorModal(
                                {
                                    message: "Authentication Failed !",
                                    description: "Your Account Status is " + user_info.status,
                                    show: true
                                }
                            );
                            setLoading(false)

                        }

                    }


                } catch (error) {
                    console.log(error);
                    if (itemIndex === final.length - 1) {
                        setErrorModal({
                            type: "error",
                            message: "Invalid Username/Password",
                            show: true
                        }
                        );
                        setLoading(false)
                    }

                }
            }
        } else {
            setErrorModal({
                show: true,
                message: 'Your Account is Expired !',
                description: 'No DNS Found !'
            })
            setLoading(false)
        }

    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setHandleLoginClicked(true);
        setLoading(true);
        if (valuesNotFilled) {
            setTimeout(() => {
                setLoading(false);
            }, 500);

        } else {
            const existedUser = getUser();
            if (existedUser) {
                const existingUsers = Object.values(existedUser);
                const demo = [null];
                const final = (dnsList.list && dnsList.list.length > 0) ? dnsList.list : demo;
                const userExists = Object.values(existedUser).map(user => Object.keys(user)).filter(user => user[0].toLowerCase() === playlistName.toLowerCase()).length > 0;
                if (userExists) {

                    const userDetails = Object.values(existingUsers.filter((user) => Object.keys(user)[0].toLowerCase() === playlistName.toLowerCase()));
                    userDetails.map(async userdetail => {
                        const userDetail = Object.values(userdetail)[0]
                        const { username: existedUsername, password: existedPassword, portallink } = userDetail;
                        const decryptedPassword = AES.decrypt(existedPassword, "thisispassword").toString(enc.Utf8);
                        const decryptedServerAddress = AES.decrypt(portallink, "thisisserveraddress").toString(enc.Utf8);
                        // const newDecryptedAddress = AES.decrypt(encryptedAddress, "thisisserveraddress").toString(enc.Utf8);
                        if (existedUsername === username && decryptedPassword === password && final?.filter(url => url === decryptedServerAddress).length > 0) {
                            alert.toggle({
                                title: "This playlist already exists ! Try another one",
                                show: true,
                                type: "warning"
                            })
                            setLoading(false)
                        } else {
                            await loginUser()
                            setHandleLoginClicked(false);
                        }
                    })

                } else {
                    await loginUser()
                    setHandleLoginClicked(false);
                }
            } else {
                await loginUser()
                setHandleLoginClicked(false);
            }
        }
    }

    const handleChange = (e, setFn) => {
        const value = e.target.value;
        setFn(value);
    }
    const handleOk = () => {
        setErrorModal(prev => {
            return {
                ...prev,
                show: false
            }
        })
        setHandleLoginClicked(false)
    }

    const firebaseSignIn = async () => {
        try {
            const response = await signInAnonymously(auth);
            if (response) {
                alert.toggle({
                    title: "Successfully logged in",
                    type: "success",
                    show: true
                })
                setTimeout(() => {
                    router('/dashboard?view=movies');
                    setLoading(false);

                }, 1000);
            }
        } catch (error) {
            console.log(error);
            alert.toggle({
                title: "Something went wrong ! Try again",
                type: "error",
                show: true
            })
            setLoading(false);

        }
    }


    return (
        <section className="login">
            <Dialog PaperProps={{ sx: { background: "transparent" } }} open={errorModal.show}>
                <Grow className='invalid-user-popup-login' in={errorModal.show} >
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <img src={crossIcon} alt='cross-svg' width={70} height={70} />
                        <div className='error-lines'>
                            <p className='invalid-title'>{errorModal.message}</p>
                            <p className='invalid-description'>{errorModal.description}</p>
                        </div>
                        <button onClick={handleOk} className='ok-btn'>Close</button>
                    </Box>
                </Grow>
            </Dialog>
            <img className='app-logo' src={logo} />

            <div className="loginInner">
                <img alt="placeholder" className='brand app-logo'  src={logo} />
                <div className="infoSlide">
                    <div className="owl-carousel">
                        <Carousel>
                            {
                                loginData.carouselItems.map(item => (
                                    <CarouselItem>
                                        <img alt="placeholder" src={item.image} />
                                        <span className="h3">{item.title}</span>
                                    </CarouselItem>
                                ))
                            }
                        </Carousel>
                    </div>
                </div>
                <form onSubmit={handleLogin} className="loginForm">
                    <div className="formGroup">
                        {inputs.playlistName.icon}
                        <input onChange={(e) => handleChange(e, setPlaylistName)} className="formControl" placeholder="Playlist Name" type="text" />
                        {(handleLoginClicked && playlistName.length === 0) && <p className='error' >This Field is required !</p>}
                    </div>
                    <div className="formGroup">
                        {inputs.username.icon}
                        <input onChange={(e) => handleChange(e, setUsername)} className="formControl" placeholder="Username" type="text" />
                        {(handleLoginClicked && username.length === 0) && <p className='error' >This Field is required !</p>}
                    </div>
                    <div className="formGroup">

                        {passwordShow ? <Visibility className="showPassword" onClick={() => setPasswordShow(!passwordShow)} /> :
                            <Password.icon onClick={() => setPasswordShow(!passwordShow)} />
                        }
                        {Password.icon2}
                        <input onChange={(e) => handleChange(e, setPassword)} className="formControl" placeholder="Password" type={passwordShow ? "text" : "password"} />
                        {(handleLoginClicked && password.length === 0) && <p className='error' >This Field is required !</p>}
                    </div>

                    {/* <div className="formGroup">
                        {inputs.server.icon}
                        <input onChange={(e) => handleChange(e, setServerAddress)} className="formControl" placeholder="Server Address" type="text" />
                        {(handleLoginClicked && serverAddress.length === 0) && <p className='error' >This Field is required !</p>}
                    </div> */}
                    {
                        loading ?
                            <Loading /> :
                            <button type='submit' href="#" className="btn">Add Playlist</button>
                    }

                </form>
            </div>
            <span className="terms"><a>
                <Link to="/playlists" onClick={() => router("/playlists")} className='list-playlists'>
                    <ViewList fontSize="large" className='icon' />
                    <p>List Playlists</p>
                </Link>
            </a></span>        </section >
    )
}

export default Login