"use client";
import React, { useState, useContext, useEffect } from 'react'
import "./styles.css"
import axios from 'axios';
// import { baseUrl } from '@/config/url';
import {CarouselItem} from '../../../helpers/carousel/login/index';
import { Alert, Backdrop, Box, Fade, FormControlLabel, Grow, Radio, RadioGroup, Slide } from '@mui/material';
// import { useRouter } from "next/router"
// import { useRouter as queryRouter } from "next/router"
import CloseIcon from '@mui/icons-material/Close';
import { AES, enc } from 'crypto-js'
import { AppContext } from '../../../contexts/app';
import { Visibility } from '@mui/icons-material';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../../firebase';
import { v4 } from "uuid";
import Loading from '../../../helpers/loading';
import { loginData } from '../../../constants/login/index';
import { getUser } from '../../../helpers/local';
// import Image from 'next/image';
import logoSmall from "../../../assets/logoSmall.png"
// import { getDbAddress, getDbAddressM3u } from '../../../pages/_app';
import { parse } from "iptv-playlist-parser"
// import link from "../../../assets/link.svg"
import M3uModal from './m3uModal';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage"
import { useNavigate, useSearchParams } from 'react-router-dom';
import Carousel from '../../../helpers/carousel/login';
import { getRandomHexColor } from '../../../helpers/methods/getRandomColor';
import { getDbAddressM3u } from '../../../helpers/methods/getDbAddress';

const LoginM3u = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const action = searchParams.get("action");
    // const router = useRouter();
    // const { action } = queryRouter().query;
    const { toggleUser, alert, streamData, m3uStreams, user, m3uUrl: m3uFile, m3uFileUpload, homeM3uStreams, scrolled } = useContext(AppContext);
    const [playlistName, setPlaylistName] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [m3uUrl, setM3uUrl] = useState(null);
    const [serverAddress, setServerAddress] = useState("");
    const [passwordShow, setPasswordShow] = useState(false);
    const [errorModal, setErrorModal] = useState({
        message: "",
        show: false
    });
    const [loading, setLoading] = useState(false);
    const [handleLoginClicked, setHandleLoginClicked] = useState(false);
    const [selectedRadio, setSelectedRadio] = useState('file');
    const [selectedFile, setSelectedFile] = useState(null);
    const [reader, setFileReader] = useState(null);
    const [notValid, setNotValid] = useState(false);
    const [streamingUrl, setStreamingUrl] = useState(null);
    const valuesNotFilled = [playlistName].filter(val => val.length === 0).length > 0;
    const { inputs } = loginData;
    const { Password } = inputs;


    useEffect(() => {
        if (getUser() && getUser().length > 0 && action !== 'add-profile') {
            // navigate('/playlists')
        };
        const fileReader = new FileReader();
        setFileReader(fileReader);
    }, []);

    useEffect(() => {
        
    }, [reader]);

    const updatedUserLocally = (downloadUrl) => {
        const currentUser = localStorage.getItem('currentUser') && JSON.parse(localStorage.getItem('currentUser'));
        const key = Object.keys(currentUser);
        const values = Object.values(currentUser);
        const updatedUser = {}
        updatedUser[key[0]] = { ...values[0], M3U: downloadUrl };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        //update user to list

        const listUsers = localStorage.getItem('listUser') && JSON.parse(localStorage.getItem('listUser'));
        const updatedList = [...listUsers.filter(user => Object.keys(user)[0] !== key[0]), updatedUser];
        localStorage.setItem('listUser', JSON.stringify(updatedList));
        m3uFile.toggle(downloadUrl);
        // alert.toggle({
        //     show: true,
        //     title: 'Saved to local',
        //     type: 'success'
        // })
    };

    const storeFile = async (file, address) => {

        const storage = getStorage();
        const fileRef = ref(storage, `${address}/${file.name}`);
        const uploadFile = uploadBytesResumable(fileRef, file);

        uploadFile.on("state_changed", (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (progress === 100) {
                m3uFileUpload.toggle(false, true);
            } else {
                m3uFileUpload.toggle(true, false);
            }
        }, err => {
            console.log(err);
        }, () => {
            getDownloadURL(uploadFile.snapshot.ref).then(downloadUrl => {
                updatedUserLocally(downloadUrl);
            })
        })
    };

    const convertToHttp = (url) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        } else {
            return 'http://' + url;
        }
    };

    const convertedUrl = convertToHttp(serverAddress);

    const loginUser = async (url, file, navigation) => {
        const uid = v4();

        // Use the hostname property to get the full domain
        // const fullDomain = anchor.hostname;
        const { fullDomain } = extractInfoFromUrl(url);
        // const username = "e23r32"
        // const password = "32t23t"
        // const fullDomain = "sv.tex01.xyz:8080"
        const encryptedAddress = AES.encrypt(convertToHttp(fullDomain), "thisisserveraddress").toString();


        try {

            const profileColor = getRandomHexColor();
            const credentials = {
                [playlistName]: {
                    id: uid,
                    profileColor,
                    loginType: 'm3u',
                    portallink: encryptedAddress,

                }
            };
            const user = {
                id: uid,
                profileColor,
                loginType: 'm3u',
                server: encryptedAddress,
            };
            const existingUsers = JSON.parse(localStorage.getItem("listUser"));
            const updatedUsers = JSON.stringify(existingUsers ? [...existingUsers, credentials] : [credentials]);
            localStorage.setItem("listUser", updatedUsers);
            localStorage.setItem("currentUser", JSON.stringify(credentials));
            toggleUser({
                ...user,
                dbAddress: getDbAddressM3u(user)
            })

            if (!file) {
                updatedUserLocally(m3uUrl);
            } else {
                storeFile(file, getDbAddressM3u(user));
            };

            firebaseSignIn(navigation);


        } catch (error) {
            console.log(error);
            setErrorModal({
                type: "error",
                message: "Invalid Username/Password",
                show: true
            }
            );
        };
        setTimeout(() => {
            setLoading(false);
        }, 1000);

    };

    const extractInfoFromUrl = (url) => {
        const anchor = document.createElement('a');
        anchor.href = url;
        return { fullDomain: anchor.hostname };
    }

    const storeUserLocally = async (url, file, navigation) => {
        const existedUser = getUser();

        if (existedUser) {
            const existingUsers = Object.values(existedUser);
            const userExists = Object.values(existedUser).map(user => Object.keys(user)).filter(user => user[0].toLowerCase() === playlistName.toLowerCase()).length > 0;
            if (userExists) {

                const userDetails = Object.values(existingUsers.filter((user) => Object.keys(user)[0].toLowerCase() === playlistName.toLowerCase()));

                userDetails.map(async userdetail => {
                    const userDetail = Object.keys(userdetail)[0]
                    const { username: existedUsername } = userDetail;
                  
                    if (userDetail === playlistName) {
                        alert.toggle({
                            title: "This playlist already exists ! Try another one",
                            show: true,
                            type: "warning"
                        });
                        setTimeout(() => {
                            router.reload();
                        }, 1500);
                        setLoading(false)
                    } else {
                        await loginUser(url, file, navigation);
                        setHandleLoginClicked(false);
                    }
                })

            } else {
                await loginUser(url, file, navigation)
                setHandleLoginClicked(false);
            }
        } else {
            await loginUser(url, file, navigation)
            setHandleLoginClicked(false);
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
        }
        else {

            if (selectedRadio === 'file') {
                if (selectedFile) {
                    reader.readAsText(selectedFile);
                } else {
                    alert.toggle({
                        show: true,
                        title: 'Select a file',
                        type: 'warning'
                    })
                    setLoading(false);
                    setHandleLoginClicked(false);
                }
            } else {
                if (!m3uUrl) {
                    alert.toggle({
                        show: true,
                        title: 'Input a valid M3U URL',
                        type: 'warning'
                    })
                    setLoading(false);
                    setHandleLoginClicked(false);
                } else {
                    try {
                        const response = await axios.get(m3uUrl);
                        const parsedData = parse(response.data);
                        const isValid = parsedData.items.filter(item => (item.group.title.length > 0) && (item.name.length > 0)).length > 0;


                        if (parsedData && isValid) {
                            const movies = parsedData.items.filter(item => item.url.includes('/movie/'));
                            const series = parsedData.items.filter(item => item.url.includes('/series/'));
                            const live = parsedData.items.filter(item => !item.url.includes('/movie/') && !item.url.includes('/series/'));
                            const { url } = parsedData.items.filter(item => item.url.length > 0)[0];
                            m3uStreams.toggle(movies, series, live);
                            homeM3uStreams.toggle(parsedData.items);
                            scrolled.toggle(0,0,0)
                            if (movies.length === 0 && series.length === 0) {
                                storeUserLocally(url, null, 'home');

                            }else{
                                storeUserLocally(url, null, 'movies');
                            }
                           
                        } else {
                            setNotValid(true);
                            setLoading(false);
                        }
                    } catch (error) {
                        setNotValid(true);
                        setLoading(false);

                        console.log('ERROR', error)
                    }
                }

            }



        }
    }


    const handleChange = (e, setFn) => {
        const value = e.target.value;
        setFn(value);
    };

    const handleOk = () => {
        setErrorModal(prev => {
            return {
                ...prev,
                show: false
            }
        })
        setHandleLoginClicked(false)
    }

    const firebaseSignIn = async (navigation) => {
        try {
            const response = await signInAnonymously(auth);
            if (response) {
                alert.toggle({
                    title: "Successfully logged in",
                    type: "success",
                    show: true
                })
                setTimeout(() => {
                    if (navigation === 'home') {
                        navigate('/dashboard/home');
                    }else{
                        navigate('/dashboard?view=movies');
                    }
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
    };

    const handleFileUpload = e => {
        // setLoading(true);
        const file = e.target.files[0];
        setSelectedFile(file);

        reader.onloadend = async e => {
            const fileContent = e.target.result;
            try {
                const parsedData = parse(fileContent);
                const isValid = parsedData.items.filter(item => (item.group.title.length > 0) && (item.name.length > 0)).length > 0;
                if (parsedData && isValid) {
                    const movies = parsedData.items.filter(item => item.url.includes('/movie/'));
                    const series = parsedData.items.filter(item => item.url.includes('/series/'));
                    const live = parsedData.items.filter(item => !item.url.includes('/movie/') && !item.url.includes('/series/'));
                    const { url } = parsedData.items.filter(item => item.url.length > 0)[0];
                    setStreamingUrl(url);
                    const categroies = []
                    parsedData.items.map(item => {
                        const exists = categroies.filter(ctg => String(ctg) === String(item.group.title)).length > 0
                        if (!exists) {
                            categroies.push(item.group.title)
                        }
                    });
                    m3uStreams.toggle(movies, series, live);
                    homeM3uStreams.toggle(parsedData.items);
                    scrolled.toggle(0,0,0)
                    if (movies.length === 0 && series.length === 0) {
                        storeUserLocally(url, file, 'home');

                    }else{
                        storeUserLocally(url, file, 'movies');
                    }
                } else {
                    setNotValid(true);
                    setLoading(false);

                };
            } catch (error) {
                setNotValid(true);
                setLoading(false);
            }

        }
    }


    return (
        <section className="login">
            <Grow className='invalid-user-popup' in={errorModal.show} >
                <Box display="flex" flexDirection="column" alignItems="center">
                    <CloseIcon className='cross-icon' color='error' />
                    <p className='invalid-title'>{errorModal.message}</p>
                    <button onClick={handleOk} className='ok-btn'>OK</button>
                </Box>
            </Grow>

            <div className="loginInner">
                <img alt="placeholder" className='brand' src={logoSmall} />
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
                    <div>
                        <div className="formGroup">
                            {inputs.playlistName.icon}
                            <input onChange={(e) => handleChange(e, setPlaylistName)} className="formControl" placeholder="Playlist Name" type="text" />
                            {(handleLoginClicked && playlistName.length === 0) && <p className='error' >This Field is required !</p>}
                        </div>

                        <div className="playlist-types-container">
                            <p>Playlist Type</p>
                            <div className='playlist-types'>
                                <RadioGroup
                                    row
                                    onChange={e => {
                                        setSelectedRadio(e.target.value)
                                    }}
                                    className='radio-inputs'
                                    aria-labelledby="demo-radio-buttons-group-label"
                                    value={selectedRadio}
                                    name="radio-buttons-group"
                                >
                                    <FormControlLabel value="url" control={<Radio sx={{
                                        color: "var(--md-source)", '&.Mui-checked': {
                                            color: 'var(--md-source)',
                                        }
                                    }} />} label="M3U File URL" />
                                    <FormControlLabel value="file" control={<Radio sx={{
                                        color: "var(--md-source)", '&.Mui-checked': {
                                            color: 'var(--md-source)',
                                        }
                                    }} />} label="M3U File" />
                                </RadioGroup>
                            </div>

                        </div>
                        {
                            selectedRadio === 'file' ?

                                <div className="browser-btn-container">
                                    {/* {inputs.playlistName.icon} */}
                                    <input id='m3u' onChange={handleFileUpload} accept=".m3u" className="formControl" placeholder="M3U URL" type="file" hidden />
                                    <label htmlFor="m3u" >Browse</label>
                                    <p>{selectedFile && selectedFile.name}</p>
                                    {/* {(handleLoginClicked && playlistName.length === 0) && <p className='error' >This Field is required !</p>} */}
                                </div>
                                :
                                <div className="formGroup">
                                    {inputs.link.icon}
                                    <input onChange={(e) => handleChange(e, setM3uUrl)} className="formControl" placeholder="M3U File URL" type="text" />
                                    {(handleLoginClicked && !m3uUrl) && <p className='error' >This Field is required !</p>}
                                </div>
                        }
                        <div className='m3u-modal-container'>
                            {/* <div className="header">
                                <h3>M3U Playlist Format</h3>
                                <svg onClick={handleClose} className='close-iconn' width="40" height="40" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="59" height="59" rx="4.91667" fill="#202842" />
                                    <path d="M18.9388 20.453L20.5747 18.8111C20.7201 18.6651 20.8658 18.6648 21.0118 18.8103L40.2767 38.0049C40.4226 38.1504 40.4229 38.296 40.2775 38.442L38.6416 40.0839C38.4961 40.2298 38.3505 40.2301 38.2045 40.0847L18.9396 20.89C18.7937 20.7446 18.7934 20.5989 18.9388 20.453Z" fill="white" stroke="white" stroke-width="1.81909" />
                                    <path d="M19.4056 37.6073L37.7278 19.218C37.8732 19.0721 38.0189 19.0718 38.1649 19.2172L39.8067 20.8531C39.9527 20.9986 39.953 21.1442 39.8075 21.2902L21.4854 39.6794C21.3399 39.8254 21.1943 39.8256 21.0483 39.6802L19.4064 38.0443C19.2605 37.8989 19.2602 37.7532 19.4056 37.6073Z" fill="white" stroke="white" stroke-width="1.81909" />
                                </svg>
                            </div> */}
                            <div className='content'>
                                <p>The Following attributes used for in M3U playlist:-</p>
                                <div className='content-items'>
                                    <div className='content-item'><p className='dot'></p>&nbsp;&nbsp;&nbsp;tvg-id-<p className='not-required'>[Not required]</p></div>
                                    <div className='content-item'><p className='dot'></p>&nbsp;&nbsp;&nbsp;tvg-name-<p className='required'>[Required]</p></div>
                                    <div className='content-item'><p className='dot'></p>&nbsp;&nbsp;&nbsp;group-title-<p className='required'>[Required]</p></div>
                                    <div className='content-item'><p className='dot'></p>&nbsp;&nbsp;&nbsp;tvg-logo-<p className='recommended'>[Recommended]</p></div>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* <div className="formGroup">

                        {passwordShow ? <Visibility className="showPassword" onClick={() => setPasswordShow(!passwordShow)} /> :
                            <Password.icon onClick={() => setPasswordShow(!passwordShow)} />
                        }
                        {Password.icon2}
                        <input onChange={(e) => handleChange(e, setPassword)} className="formControl" placeholder="Password" type={passwordShow ? "text" : "password"} />
                        {(handleLoginClicked && password.length === 0) && <p className='error' >This Field is required !</p>}
                    </div> */}

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
            <span className="terms">By using this application, I agree to <a href="https://smarterspro.com/terms-conditions/">Terms and Conditions.</a></span>
            <M3uModal
                onClose={() => setNotValid(false)}
                open={notValid} />
        </section >
    )
}

export default LoginM3u