import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../contexts/app'
import { Alert, Slide } from '@mui/material';
import Loading from '../helpers/loading';
import { AES, enc, MD5 } from 'crypto-js';
import { getDbAddress, getDbAddressM3u } from '../helpers/methods/getDbAddress';
import { getLocal as getEpgSrc } from '../helpers/local';
import axios from 'axios';
// import { baseUrl } from '../config/url';
import { endpoint } from '../config/endpoints';
// import Disclaimer from '../components/disclaimer';
import NetworkAlert from '../components/networkAlert';
import { db } from '../firebase';
import { getDocs, collection } from "firebase/firestore"

const getDnsList = async () => {
    // const sc = MD5("Ke45e19e0374251559077f8dba2b2393e*NB!@#12ZKWd-TomFoolery11-4197841-4.0.1-unknown-Google sdk_google_atv64_arm64-13 TIRAMISU").toString()
    // console.log("SC", sc)
    // const body = {
    //   u: "TomFoolery11",
    //   k: "Ke45e19e0374251559077f8dba2b2393e",
    //   sc,
    //   pw: "no_password",
    //   r: "4197841",
    //   av: "4.0.1",
    //   dt: "unknown",
    //   d: "Google sdk_google_atv64_arm64",
    //   do: "13 TIRAMISU",
    //   m: "gu"
    // }

    // try {
    //     const response = await axios.post('https://api-android.whmcssmarters.com/?/Android', body, {
    //         headers: {
    //             'User-Agent': 'IPTV Smarters Pro',
    //             "Content-Type": "application/x-www-form-urlencoded",
    //         }
    //     });
    //     console.log("response", response.data)
    //     const strArr = response.data.su;
    //     const toArr = strArr.split(",");
    //     console.log("TO ARR", toArr);
    //     return toArr;
    // } catch (error) {
    //     console.log("ERROR", error)
    //     return null
    // }

    try {
        const querySnapshot = await getDocs(collection(db, 'App'))
        const items = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }))
        const dnsList = items[0].DNS.slice(0, 5)
        const currentTheme = items[0].CurrentTheme
        return {
            dnsList, currentTheme
        }
    } catch (error) {
        console.log('Error fetching data: ', error)
    }
}

const Layout = ({ children }) => {
    const { alert } = useContext(AppContext);
    const [user, setUser] = useState(null);
    const [dnsList, setDnsList] = useState(null);
    const [streamData, setStreamData] = useState({
        movies: {
            streams: null,
            streamCategories: null,
        },
        series: {
            streams: null,
            streamCategories: null,
        },
        liveTv: {
            streams: null,
            streamCategories: null,
        }
    });
    const [parentalVerified, setParentalVerified] = useState(false);
    const [alertProps, setAlertProps] = useState({
        show: false,
        type: "",
        title: ""
    });
    const [currentTheme, setCurrentTheme] = useState("dark");
    const [currentColor, setCurrentColor] = useState("evandro");
    const [movieBannerStreams, setMovieBannerStreams] = useState(null);
    const [seriesBannerStreams, setSeriesBannerStreams] = useState(null);
    const [m3uStreams, setM3uStreams] = useState({
        movies: null,
        series: null,
        live: null
    });
    const [m3uUrl, setM3uUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    //m3u file uploaded

    const [m3uFileUploading, setM3uFileUplaoding] = useState(false);
    const [m3uFileUploaded, setM3uFileUploaded] = useState(false);
    const [homeM3uStreams, setHomeM3uStreams] = useState(null);
    const [scrolledPosition, setScrolledPosition] = useState({
        h: 0,
        m: 0,
        s: 0
    });

    const [epgSrc, setCurrentEpgSrc] = useState(null);
    const [epgSrcList, setEpgSrcList] = useState([]);

    const [currentPlayer, setCurrentPlayer] = useState('flowplayer')

    const getFromLocalStorage = (key) => {
        if (!key || typeof window === 'undefined') {
            return ""
        }
        return JSON.parse(localStorage.getItem(key))
    }

    const getLocal = (key) => {
        if (!key || typeof window === 'undefined') {
            return ""
        }
        return localStorage.getItem(key)
    }

    useEffect(() => {
        document.documentElement.className = currentColor
    }, [currentColor]);

    useEffect(() => {
        // Fetch the device name from the main process
        // window?.electron.ipcRenderer.invoke('get-device-name').then((name) => {
        //   console.log(name);
        // });
        getDnsList()
            .then((res) => {
                setDnsList(res ? res.dnsList : [])
                setCurrentColor(res.currentTheme);
            })
            .catch(() => setDnsList(null))
    }, []);


    const currentUser = getFromLocalStorage("currentUser");

    useEffect(() => {
        if (currentTheme === "dark") {
            document.body.classList.remove("light");
            document.body.classList.add(currentTheme);
        } else {
            document.body.classList.remove("dark");
            document.body.classList.add(currentTheme);
        }
    }, [currentTheme]);

    useEffect(() => {
        if (currentUser) {
            const { username, password, portallink, serverInfo, userInfo, loginType, token, M3U, id } = Object.values(currentUser)[0]
            if (loginType === 'm3u') {
                const user = {
                    loginType,
                    username,
                    password,
                    server: portallink
                }
                setUser({
                    ...user,
                    dbAddress: getDbAddressM3u(user)

                });
                setM3uUrl(M3U);
            } else {

                const time = serverInfo ? JSON.parse(AES.decrypt(serverInfo, "thisisserverinfo").toString(enc.Utf8)).time_now : 'UTC';
                const getTimeDifference = () => {
                    const difference = new Date().getHours() - new Date(time).getHours();
                    return difference;
                }
                const user = {
                    username,
                    password,
                    serverPrefix: portallink,
                    server: portallink,
                    timeDifference: getTimeDifference(),
                    serverInfo,
                    userInfo,
                    loginType,
                    token
                }

                setUser({
                    ...user,
                    dbAddress: getDbAddress(user, null),
                    decryptedDbAddress: getDbAddress(user, 'decrypted')
                });
                // getCurrentEpg(user)

            }
            if (getEpgSrc("epgSources")) {

                setEpgSrcList(getEpgSrc("epgSources").filter(epg => epg.playlistId === id))
            }
        }
        if (getLocal("theme")) {
            setCurrentTheme(getLocal("theme"))
        }
        if (getLocal('player')) {
            setCurrentPlayer(getLocal('player'))
        }
        if (getLocal("color")) {
            setCurrentColor(getLocal("color"))
        }

        // Add your logic here to add the class to the body element
        document.body.classList.add('noTabs');
        document.onkeydown = function (e) {
            if (event.keyCode == 123) {
                return false;
            }
            if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
                return false;
            }
            if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
                return false;
            }
            if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
                return false;
            }
        }
    }, []);

    // const getCurrentEpg = async (user) => {
    //     const decryptedServerAddress = AES.decrypt(user.server, "thisisserveraddress").toString(enc.Utf8);
    //     const decryptedPassword = AES.decrypt(user.password, "thisispassword").toString(enc.Utf8);
    //     const defaultEpgSrc = `${decryptedServerAddress}/xmltv.php?username=${user.username}&password=${decryptedPassword}`;
    //     const getCurrentEpgSrc = localStorage.getItem("currentEpgSrc") && JSON.parse(localStorage.getItem("currentEpgSrc"));
    //     const headers = {
    //         username: user.username,
    //         password: user.password,
    //         server: user.server,
    //         type: user.loginType,
    //         token: user.token,
    //         epgSrc: getCurrentEpgSrc && getCurrentEpgSrc.src
    //     };
    //     try {
    //         const response = await axios.get(`${baseUrl}${endpoint.getEpgSrc}`, {
    //             headers: headers,
    //         });
    //         setCurrentEpgSrc({
    //             name: getCurrentEpgSrc ? getCurrentEpgSrc.name : "Inbuilt EPG Source",
    //             src: getCurrentEpgSrc ? getCurrentEpgSrc.src : defaultEpgSrc,
    //             data: response.data.message
    //         })

    //     } catch (error) {
    //         console.log("Error", error)
    //     }
    // }


    const contextValue = {
        user: user,
        toggleUser: (userDetail) => {
            setUser(userDetail);
        },
        dnsList: {
            list: dnsList,
        },
        streamData: {
            movies: {
                streams: streamData.movies.streams,
                streamCategories: streamData.movies.streamCategories,
                toggle: (data, type) => {
                    setStreamData(prev => {
                        return {
                            ...prev,
                            movies: {
                                streams: type === "streams" ? data : prev.movies.streams,
                                streamCategories: type === "categories" ? data : prev.movies.streamCategories
                            }
                        }
                    })
                },
                banner: {
                    streams: movieBannerStreams,
                    toggle: (streams) => setMovieBannerStreams(streams)
                }
            },
            series: {
                streams: streamData.series.streams,
                streamCategories: streamData.series.streamCategories,
                toggle: (data, type) => {
                    setStreamData(prev => {
                        return {
                            ...prev,
                            series: {
                                streams: type === "streams" ? data : prev.series.streams,
                                streamCategories: type === "categories" ? data : prev.series.streamCategories
                            }
                        }
                    })
                },
                banner: {
                    streams: seriesBannerStreams,
                    toggle: (streams) => setSeriesBannerStreams(streams)
                }
            },
            liveTv: {
                streams: streamData.liveTv.streams,
                streamCategories: streamData.liveTv.streamCategories,
                toggle: (data, type) => {
                    setStreamData(prev => {
                        return {
                            ...prev,
                            liveTv: {
                                streams: type === "streams" ? data : prev.liveTv.streams,
                                streamCategories: type === "categories" ? data : prev.liveTv.streamCategories
                            }
                        }
                    })
                }
            }
        },
        epgSrc: {
            currentEpgSrc: epgSrc,
            data: epgSrc?.data,
            toggle: (src) => setCurrentEpgSrc(src)
        },
        epgSrcList: {
            list: epgSrcList,
            toggle: (list) => setEpgSrcList(list)
        },
        alert: {
            title: alertProps.title,
            show: alertProps.show,
            type: alertProps.type,
            toggle: (alertDetails) => {
                setAlertProps(alertDetails);
                setTimeout(() => {
                    setAlertProps({
                        ...alertProps,
                        show: false
                    })
                }, 1000);
            }
        },
        parentalVerified: {
            status: parentalVerified,
            toggle: (status) => setParentalVerified(status)
        },
        theme: {
            current: currentTheme,
            color: currentColor,
            toggleTheme: (theme) => setCurrentTheme(theme),
            toggleColor: (color) => setCurrentColor(color)
        },
        m3uStreams: {
            streams: {
                movies: m3uStreams.movies,
                series: m3uStreams.series,
                live: m3uStreams.live
            },
            toggle: (movies, series, live) => setM3uStreams({ movies, series, live })
        },
        m3uUrl: {
            url: m3uUrl,
            toggle: (url) => setM3uUrl(url)
        },
        homeM3uStreams: {
            streams: homeM3uStreams,
            toggle: (streams) => setHomeM3uStreams(streams)
        },
        m3uFileUpload: {
            uploading: m3uFileUploading,
            uploaded: m3uFileUploaded,
            toggle: (uploading, uploaded) => {
                setM3uFileUplaoding(uploading);
                setM3uFileUploaded(uploaded);
            }
        },
        scrolled: {
            h: scrolledPosition.h,
            m: scrolledPosition.m,
            s: scrolledPosition.s,
            toggle: (h, m, s) => setScrolledPosition({ h, m, s })
        },
        loading: {
            state: loading,
            toggle: (state) => setLoading(state)
        },
        currentPlayer: {
            player: currentPlayer,
            toggle: (player) => setCurrentPlayer(player)
        }
    }

    return (
        <AppContext.Provider value={contextValue}>
            {loading && <Loading />}
            <Slide direction="left" in={alertProps.show} style={{
                position: "fixed",
                top: 10,
                right: 10,
                zIndex: 9999999
            }}>
                <Alert style={{ fontWeight: "bold" }} severity={alertProps.type}>{alertProps.title}</Alert>
            </Slide>
            {/* <Disclaimer/> */}
            <NetworkAlert />
            {children}
        </AppContext.Provider>
    )
}

export default Layout