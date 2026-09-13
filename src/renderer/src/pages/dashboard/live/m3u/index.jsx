import React, { useState, useEffect, useContext, useRef } from 'react'
import DashboardHeader from '../../header';
import useApi from '../../../../hooks/useApi';
// import { endpoint } from '../../config/endpoints';
import { AppContext } from '../../../../contexts/app';
import Loading from '../../../../helpers/loading';
import { Alert, Backdrop, CircularProgress, Slider } from '@mui/material';
import "./styles.css"
import LiveTVPlayer from '../player';
import { AES, enc } from 'crypto-js';
import { addToFavs, getFavourites, getRecents, removeFromFavs, saveWatchedContent } from '../../../../firebase/functions';
import { DateTime } from 'luxon';
// import { useRouter } from 'next/router';
import ParentalLock from '../../../../helpers/parentalLock';
import { getParentalPin } from '../../../../helpers/local';
import { Cancel } from '@mui/icons-material';
// import Image from 'next/image';
import noContentFound from "../../../../assets/noContentFound.svg"
import placeholderImage from "../../../../assets/placeholder.png"
import lockIcon from "../../../../assets/lockIcon.svg"
import { parse } from 'iptv-playlist-parser';
import axios from 'axios';
import { concatUrl } from '../../../../helpers/methods/concatUrl';
import VideoJSPlayer from '../../../../helpers/player2';
import { useNavigate, useSearchParams } from 'react-router-dom';

const M3ULive = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const router = useNavigate();
    const liveStreamsRef = useRef(null)
    const { makeRequest } = useApi();
    const view = searchParams.get("view");
    // const { view } = useRouter().query;
    const { user, alert, streamData, m3uStreams, m3uUrl, homeM3uStreams, currentPlayer } = useContext(AppContext);
    // const { liveTv } = streamData;
    const { live: m3uLiveStreams } = m3uStreams.streams;
    const [liveCategories, setLiveCategories] = useState([]);
    const [searchedCategories, setSearchedCategories] = useState([]);
    const [liveStreams, setLiveStreams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [currentLiveStreams, setCurrentLiveStreams] = useState([]);
    const [epgs, setEpgs] = useState([]);
    const [playerSrc, setPlayerSrc] = useState(null);
    const [favourites, setFavourites] = useState([]);
    const [progress, setProgress] = useState(0);
    const [currentStreamId, setCurrentStreamId] = useState(null);
    const [currentStream, setCurrentStream] = useState(null);
    const [timerStart, setTimerStart] = useState(false);
    const [favouriteChannels, setFavouriteChannels] = useState([]);
    const [channelHistory, setChannelHistory] = useState([]);
    const [searchOn, setSearchOn] = useState(false);
    const [showExtraCtg, setShowExtraCtg] = useState({
        favourite: true,
        channelHistory: true
    });
    const [idExists, setIdExists] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [isAdult, setIsAdult] = useState(false);
    const [pinVerified, setPinVerified] = useState(false);
    const [noData, setNoData] = useState(false);
    const [onceAutoPlayed, setOnceAutoPlayed] = useState(false);
    const parentalPin = getParentalPin("currentUser");
    const [searchedValue, setSearchedValue] = useState('');
    const [errorIndex, setErrorIndex] = useState(null);
    const [clickedAdultCtg, setClickedAdultCtg] = useState(null);

    const { movies, series, live: liveTv } = m3uStreams.streams

    useEffect(() => {
        if (user) {
            if (m3uStreams.streams.live) {
                getLiveCategories();
            } else {
                getLiveStreams();
            }
        }
    }, [user, m3uStreams.streams.live]);

    // useEffect(() => {
    //     if ((!movies && !series) || ((movies && movies.length === 0) && (series && series.length === 0))) {

    //         setNoData(true);
    //     } else {
    //         setNoData(false);
    //     }
    // }, [movies, series])
    useEffect(() => {
        if (user && liveTv && selectedCategory) {
            setCurrentLiveStreams([])
            getFavouriteChannels();
            getChannelHistory();
            getCurrentLiveStreams();
        }
    }, [user, liveTv, selectedCategory]);


    useEffect(() => {
        if (liveCategories && liveTv) {
            if (view) {
                const decryptedId = AES.decrypt(decodeURIComponent(view), "thisisliveurl").toString(enc.Utf8);
                const stream = liveTv.filter(stream => concatUrl(String(stream.url)) === concatUrl(String(decryptedId)))[0];
                const categoryId = stream.group.title;
                const foundedCategory = liveCategories.filter(ctg => String(ctg) === String(categoryId))[0]
                setSelectedCategory(foundedCategory);
                setCurrentStreamId(decryptedId);
            } else {
                setSelectedCategory(liveCategories[0]);
                setCurrentStreamId(concatUrl(liveTv[0].url))
            }
        }

    }, [liveCategories, liveTv]);

    useEffect(() => {
        setCurrentLiveStreams([]);
        if (selectedCategory && liveTv && liveStreamsRef.current) {
            getCurrentLiveStreams();
            getChannelHistory();
            getFavouriteChannels();
            liveStreamsRef.current.scrollTo(0, 0);
        }
    }, [selectedCategory, liveTv, liveStreamsRef]);

    useEffect(() => {
        if (epgs.length > 0) {
            currentProgress();
            setTimerStart(true)
        }
    }, [epgs]);

    useEffect(() => {
        if (view) {
            setIdExists(true);
        } else {
            setIdExists(false);
        }
    }, [view])

    useEffect(() => {
        if (currentStreamId && timerStart && epgs.length > 0) {

            const currentTime = new Date().getTime();
            const formattedEndDate = typeof epgs[0].end === 'number' ? DateTime.fromSeconds(epgs[0].end, { zone: timeZone }).toFormat('yyyy-MM-dd HH:mm:ss') : epgs[0].end;
            const episodeEndTIme = DateTime.fromFormat(formattedEndDate, 'yyyy-MM-dd HH:mm:ss', { zone: timeZone }).setZone('Asia/Kolkata');
            const endTime = new Date(episodeEndTIme).getTime() + 100000;
            const delay = (endTime - currentTime);
            if (delay > 0) {
                const timer = setTimeout(() => {
                    handleEpg(currentLiveStreams.filter(stream => concatUrl(String(stream.url)) === String(currentStreamId))[0])
                }, delay);
                return () => clearTimeout(timer);
            };
        }
    }, [currentStreamId, timerStart, epgs]);

    const getLiveCategories = () => {
        const categories = [];
        m3uLiveStreams.map(stream => {
            const exists = categories.filter(ctg => ctg === stream.group.title).length > 0;
            const ctgName = stream.group.title;
            if (!exists && ctgName !== null && ctgName.length > 0) {
                categories.push(ctgName);
            }
        });
        setLiveCategories(categories)
    };

    const getLiveStreams = async () => {
        setLoading(true);
        try {
            const response = await axios.get(m3uUrl.url);
            const parsedData = parse(response.data);
            const isValid = parsedData.items.filter(item => (item.group.title.length > 0) && (item.name.length > 0)).length > 0;

            if (parsedData && isValid) {
                const movies = parsedData.items.filter(item => !item.url.includes('/movie/'));
                const series = parsedData.items.filter(item => item.url.includes('/series/'));
                const live = parsedData.items.filter(item => !item.url.includes('/movie/') && !item.url.includes('/series/'));
                m3uStreams.toggle(movies, series, live);
                homeM3uStreams.toggle(parsedData.items)

            }
        } catch (error) {
            console.log('ERROR', error)
        }
        setLoading(false);
    }


    const timeZone = 'America/NewYork'
    //  user && JSON.parse(AES.decrypt(user.serverInfo, "thisisserverinfo").toString(enc.Utf8)).timezone;

    const convertURL = (simplifiedURL, extension) => {
        // Split the simplified URL by '/'
        const withoutProtocol = simplifiedURL.split('//')[1];
        const parts = withoutProtocol.split('/');
        // Check if the URL format is correct
        if (parts.length !== 4) {
            return simplifiedURL
        }

        // Extract necessary parts from the simplified URL
        const [domain, username, password, videoAndExtension] = parts;
        const [videoId, ext] = videoAndExtension.split('.')
        // Construct the original URL format
        const originalURL = `http://${domain}/live/${username}/${password}/${videoId}.${extension}`;

        return originalURL;
    }

    function formatDateToYYYYMMDDHHMMSS(inputDate) {
        if (!(inputDate instanceof Date)) {
            inputDate = new Date(inputDate); // Attempt to parse the input as a Date
        }

        if (isNaN(inputDate.getTime())) {
            return null;
        }

        const year = inputDate.getFullYear();
        const month = String(inputDate.getMonth() + 1).padStart(2, "0");
        const day = String(inputDate.getDate()).padStart(2, "0");
        const hours = String(inputDate.getHours()).padStart(2, "0");
        const minutes = String(inputDate.getMinutes()).padStart(2, "0");
        const seconds = String(inputDate.getSeconds()).padStart(2, "0");

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    const formattedStartTime = (time) => {
        const dt = new Date(time).getTime();
        if (dt.toString() !== 'NaN') {
            if (user.loginType === 'one-stream-panel') {
                const parsedTime = formatDateToYYYYMMDDHHMMSS(dt)
                const foreignTime = DateTime.fromFormat(parsedTime, 'yyyy-MM-dd HH:mm:ss');
                return foreignTime.toLocaleString(DateTime.TIME_SIMPLE);
            } else {
                const parsedTime = formatDateToYYYYMMDDHHMMSS(dt)
                const foreignTime = DateTime.fromFormat(parsedTime, 'yyyy-MM-dd HH:mm:ss', { zone: timeZone });
                const indianTime = foreignTime.setZone('Asia/Kolkata');
                return indianTime.toLocaleString(DateTime.TIME_SIMPLE);

            }
        }
        return null

    }

    const adultCategories = ["adult", "xxx", "porn", "sex", "adults", "ADULTS", "+18", "18+", "18"];

    const getOneStreamURL = (id) => {
        return liveTv.filter(stm => String(stm?.stream_id) === String(id))[0].links.m3u8
    };

    const getShortEpg = async (stream, verified) => {
        const id = concatUrl(stream.url);
        const ctgName = liveTv.filter(stm => concatUrl(String(stm?.url)) === String(id))[0]?.group.title;
        setEpgs([]);
        setPlayerSrc(null);

        const adult = adultCategories.filter(ctg => ctgName.toLowerCase().includes(ctg.toLowerCase())).length > 0;
        setTimeout(() => {
            if (pinVerified) {
                try {
                    setEpgs([]);
                    setPlayerSrc(stream.url)
                } catch (error) {
                    console.log(error)
                }
            } else {
                if (parentalPin) {
                    setIsAdult(adult);
                    if (!adult) {
                        try {

                            setEpgs([]);
                            setPlayerSrc(stream.url)
                        } catch (error) {
                            console.log(error);
                        }
                        setPinVerified(false);
                    } else {
                        if (adult && verified) {
                            try {
                                setEpgs([]);
                                setPlayerSrc(stream.url)
                            } catch (error) {
                                console.log(error)
                            }
                            setIsAdult(false)
                            setPinVerified(false)
                        }
                    }
                } else {
                    setPlayerSrc(stream.url)
                }
            }
        }, 500);


    }

    const getCurrentLiveStreams = (type) => {
        if (selectedCategory !== "Favourites" && selectedCategory !== "Channel History") {
            const streams = liveTv.filter(stream =>
                String(stream?.group.title).toLowerCase() === String(selectedCategory).toLowerCase()
            );
            setCurrentLiveStreams(streams);
            if (!view) {
                setCurrentStreamId(currentStreamId ? currentStreamId : concatUrl(streams[0].url));
                if (!onceAutoPlayed) {
                    handleEpg(streams[0])
                    setCurrentStream(streams[0])
                    setOnceAutoPlayed(true);
                }
            };
            if (!onceAutoPlayed) {
                if (type !== 'fav') {
                    if (view) {
                        const url = AES.decrypt(view.replace(/ /g, '+'), 'thisisliveurl').toString(enc.Utf8);
                        const stream = liveTv.filter(item => item.url === url)[0];
                        handleEpg(stream)
                        setOnceAutoPlayed(true)

                    } else {
                        getShortEpg(streams[0], pinVerified)
                        setOnceAutoPlayed(true)

                    }
                }
            }
        }
    };

    const getFavouriteChannels = async () => {
        try {
            const response = await getFavourites("LiveTv", user.dbAddress);
            const ids = response.val() ? Object.keys(response.val()) : [];
            setFavourites(ids);
            let favouriteStreams = []
            ids.map(id => {
                const matchedComp = liveTv.filter(str => concatUrl(String(str.url)) === String(id))[0];
                if (matchedComp) {
                    favouriteStreams.push(matchedComp);
                }
            });
            setFavouriteChannels(favouriteStreams);
        } catch (error) {
            setFavouriteChannels([])
        };
        getCurrentLiveStreams('fav');
    };

    const getChannelHistory = async () => {
        try {
            const response = await getRecents("LiveTv", user.dbAddress);
            const ids = Object.keys(response.val());
            let channelHistory = [];
            ids.map(id => {
                const matchedComp = liveTv.filter(str => concatUrl(String(str.url)) === String(id))[0];
                if (matchedComp) {
                    channelHistory.push(matchedComp);
                }
            });
            setChannelHistory(channelHistory);
        } catch (error) {
            setChannelHistory([])
        };
    };

    const handleEpg = (stream) => {
        setPlayerSrc(null);
        const streamId = concatUrl(stream.url);
        getShortEpg(stream, pinVerified);
        setCurrentStreamId(String(streamId));
    };


    const getStreamIdFromUrl = url => {
        const regex = /\/(\d+)\.\w+$/; // Regular expression to match the stream ID before any file extension
        const match = url.match(regex);

        if (match && match.length > 1) {
            return match[1]; // Extracted stream ID
        } else {
            return null; // If no match found
        }
    };

    const handleSearch = e => {
        const { value } = e.target;
        setSearchedValue(value);
        let searchedEntries = liveCategories.filter(ctg => ctg.toLowerCase().includes(value.toLowerCase()));
        setSearchedCategories(searchedEntries);
        if (value.length === 0) {
            setSearchOn(false);
            setShowExtraCtg({
                favourite: true,
                channelHistory: true
            });
        } else {
            const isFavourite = "Favourite".toLowerCase().includes(value);
            const isChannelHistory = "Channel History".toLowerCase().includes(value);
            setShowExtraCtg({
                favourite: isFavourite,
                channelHistory: isChannelHistory
            });
            setSearchOn(true);
        }
    }

    const handleFavourite = async (id, isFavourite) => {
        const favId = concatUrl(id);
        if (isFavourite) {
            await removeFromFavs(favId, "LiveTv", user.dbAddress);
        } else {
            await addToFavs(favId, "LiveTv", user.dbAddress);
        }
        getFavouriteChannels();
        alert.toggle({
            title: `${isFavourite ? 'Removed from Favourites' : "Added To Favourites"}`,
            show: true,
            type: 'success'
        })
    };

    const currentProgress = () => {
        const { start, end } = epgs[0];
        const formattedStartDate = typeof start === 'number' ? DateTime.fromSeconds(start, { zone: timeZone }).toFormat('yyyy-MM-dd HH:mm:ss') : start;
        const formattedEndDate = typeof end === 'number' ? DateTime.fromSeconds(end, { zone: timeZone }).toFormat('yyyy-MM-dd HH:mm:ss') : end;
        const startTime = DateTime.fromFormat(formattedStartDate, 'yyyy-MM-dd HH:mm:ss', { zone: timeZone }).setZone('Asia/Kolkata');
        const endTime = DateTime.fromFormat(formattedEndDate, 'yyyy-MM-dd HH:mm:ss', { zone: timeZone }).setZone('Asia/Kolkata');
        const convertedStartTime = new Date(startTime).getTime();
        const convertedEndTime = new Date(endTime).getTime()
        const currentTime = new Date().getTime();
        const fullTime = (convertedEndTime - convertedStartTime) / 1000;
        const elapsedTime = (currentTime - convertedStartTime) / 1000;
        const pct = Number((100 * elapsedTime / fullTime).toFixed(2));
        setProgress(pct);
    };

    const saveChannelHistroy = async () => {
        setIdExists(false);
        try {
            await saveWatchedContent.liveTv(currentStreamId, user.dbAddress);
        } catch (error) {
            console.log(error)
        }
    }

    const handlePinVerified = () => {
        setPinVerified(true);
        setIsAdult(false);
        if (selectedCategory.category_name === "Favourites" ||
            selectedCategory.category_name === "Channel History") {
            getShortEpg(currentStream, true);
            setSelectedCategory(clickedAdultCtg);
        } else {
            setSelectedCategory(clickedAdultCtg);
        }
    }

    const handleClearSearch = () => {
        setSearchedValue("");
        setSearchOn(false);
        setShowExtraCtg({
            favourite: true,
            channelHistory: true
        });
    };

    const handleLiveStream = (e, s) => {
        setCurrentStream(s);
        const clickedElement = e.target.tagName;
        const isFavourite = clickedElement === 'svg' || clickedElement === 'path';
        if (!isFavourite) {
            handleEpg(s)
        }
    }

    const handleCategory = category => {
        setPinVerified(false)
        setCurrentStreamId(null)
        const adult = adultCategories.filter(ctg => category.toLowerCase().includes(ctg.toLowerCase())).length > 0;
        if (parentalPin) {
            setIsAdult(adult);
            setClickedAdultCtg(category)
            if (!adult) {
                setSelectedCategory(category)
                setPinVerified(false);
            } else {
                if (adult && pinVerified) {
                    setSelectedCategory(category)
                    setIsAdult(false)
                    setPinVerified(false)
                }
            }
        } else {
            setSelectedCategory(category);
            setPinVerified(false)
        }
    };
    return (


        loading ? <Loading /> :
            <>
                <DashboardHeader currentAction="live" />
                {noData  ? < div className="no-data-found-container">
                    {/* <Error color="warning" sx={{ fontSize: 30 }} /> */}
                    <img src={noContentFound} alt='live-stream' />
                    <h2 className="no-data-found">No Live Streams found</h2>
                </div> :
                    <section className="liveTv">
                        <div className="panel tvCategory">
                            <div className="pHead">
                                <div className="controls">
                                    {
                                        searchedValue.length > 0 ?
                                            <Cancel sx={{ zIndex: 9, ":hover": { cursor: "pointer" } }} onClick={handleClearSearch} /> :
                                            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M24.1175 26.1783C17.3706 31.352 8.08155 29.4127 3.57637 23.2248C-0.68313 17.3743 0.0222769 9.14911 5.26344 4.18996C10.6336 -0.891038 18.8046 -1.19482 24.501 3.47881C30.3196 8.25287 31.6682 16.9694 26.8365 23.4239C26.9409 23.5359 27.0477 23.6578 27.162 23.7719C29.1119 25.7217 31.0609 27.6722 33.0147 29.6185C33.5862 30.1878 33.854 30.8417 33.6315 31.6459C33.2639 32.9734 31.6879 33.5093 30.5881 32.6788C30.431 32.5601 30.2915 32.4168 30.1513 32.277C28.2428 30.3722 26.335 28.4663 24.4296 26.5579C24.3115 26.4402 24.2163 26.3001 24.1175 26.1783ZM15.2969 25.2385C21.1588 25.229 25.8636 20.5245 25.8675 14.668C25.8717 8.79405 21.1448 4.07337 15.2667 4.08145C9.40626 4.08917 4.70179 8.79476 4.69757 14.6522C4.6937 20.528 9.41961 25.248 15.2969 25.2385Z" fill="#748BC8" /> </svg>
                                    }
                                    <input onChange={handleSearch} value={searchedValue} placeholder="Search by Category or Channel name" />
                                </div>
                            </div>
                            <div className="pBody">
                                {
                                    showExtraCtg.favourite &&
                                    <a
                                        onClick={() => handleCategory("Favourites")} href="javascript:void(0)">Favourite</a>
                                }
                                {
                                    showExtraCtg.channelHistory &&
                                    <a
                                        onClick={() => handleCategory("Channel History")} href="javascript:void(0)">Channel History</a>
                                }

                                {
                                    (searchOn ? searchedCategories : liveCategories).map(category => {
                                        const category_name = category;
                                        const isAdult = adultCategories.filter(ctg => category_name.toLowerCase().includes(ctg)).length > 0;
                                        return <a
                                            style={{ display: "flex", justifyContent: 'space-between' }}
                                            className={category_name === selectedCategory ? 'active' : ''}
                                            onClick={() => handleCategory(category)} href="javascript:void(0)">
                                            {category_name}
                                            {/* <img src='/parentalLock.svg' alt='parental-lock-icon' /> */}
                                            <svg display={(isAdult && parentalPin) ? "block" : "none"} width="20" height="26" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.35342 0.978516C9.71046 0.978516 10.0675 0.978516 10.4246 0.978516C10.6069 1.0108 10.7891 1.04529 10.972 1.07454C13.6371 1.50415 15.8459 3.8255 16.0656 6.51604C16.1583 7.65313 16.1075 8.80208 16.1216 9.94578C16.1229 10.0653 16.1218 10.1847 16.1218 10.3277C16.3536 10.3277 16.5625 10.3274 16.7714 10.3277C18.2385 10.3296 19.2373 11.3213 19.2379 12.7826C19.2392 16.337 19.239 19.8918 19.2379 23.4462C19.2373 24.9108 18.2409 25.908 16.7791 25.9094C15.3184 25.9108 13.8576 25.9097 12.3969 25.9097C9.24001 25.9097 6.08316 25.9124 2.92631 25.9083C1.60326 25.9066 0.549224 24.9067 0.545085 23.6167C0.533772 19.9486 0.535152 16.2805 0.545085 12.6123C0.54812 11.4981 1.37617 10.547 2.47545 10.3743C2.8554 10.3147 3.24694 10.3277 3.65641 10.3061C3.65641 10.2176 3.65641 10.1301 3.65641 10.0429C3.65696 9.06089 3.64813 8.07888 3.65972 7.09714C3.69007 4.49186 5.41763 2.12443 7.89129 1.3179C8.36506 1.16338 8.86531 1.08944 9.35342 0.978516ZM14.04 10.321C14.04 9.49768 14.0469 8.69612 14.0372 7.89484C14.0314 7.42549 14.0414 6.95007 13.9718 6.48817C13.6457 4.31968 11.4524 2.74195 9.29354 3.10037C7.17969 3.45107 5.74929 5.12373 5.73853 7.26407C5.73384 8.20498 5.73743 9.14615 5.73798 10.0871C5.73798 10.1638 5.7446 10.2405 5.74819 10.321C8.51957 10.321 11.2598 10.321 14.04 10.321ZM9.88457 14.4809C8.99416 14.4842 8.19481 15.0664 7.91475 15.9154C7.63634 16.7589 7.92192 17.6764 8.65147 18.2081C8.81095 18.3242 8.86062 18.4412 8.85786 18.628C8.8482 19.293 8.85206 19.958 8.85593 20.623C8.85675 20.7515 8.86282 20.8848 8.89732 21.0073C9.03279 21.4883 9.51318 21.8086 9.9897 21.749C10.5222 21.6822 10.9071 21.2879 10.9174 20.7609C10.9312 20.0557 10.9295 19.3498 10.9187 18.6443C10.9157 18.4478 10.967 18.3253 11.1326 18.2036C11.8607 17.6681 12.1408 16.7523 11.8583 15.908C11.5735 15.0553 10.7742 14.4776 9.88457 14.4809Z" fill="white" />
                                            </svg>

                                        </a>
                                    })
                                }
                                {
                                    (searchOn && searchedCategories.length === 0 && !showExtraCtg.channelHistory && !showExtraCtg.favourite) &&
                                    <h1 className='no-category-found'>No Categories Found !</h1>
                                }
                            </div>
                        </div>
                        <div className="panel tvList">
                            <div className="pHead">
                                <span className="h5">{selectedCategory}</span>
                            </div>
                            <div className="pBody" ref={liveStreamsRef}>
                                {
                                    (selectedCategory === "Favourites" ? favouriteChannels : selectedCategory === "Channel History" ? channelHistory : currentLiveStreams).map((stream, index) => {

                                        const { stream_id } = stream;
                                        const isFavourite = favourites.filter(id => String(id) === concatUrl(String(stream.url))).length > 0;
                                        const isEqual = concatUrl(stream.url) === String(currentStreamId);
                                        const ctgName = liveCategories.filter(ctg => String(ctg) === String(stream.group.title))[0];
                                        const adult = adultCategories.filter(ctg => ctgName.toLowerCase().includes(ctg.toLowerCase())).length > 0;

                                        return <div onClick={(e) => handleLiveStream(e, stream)}
                                            style={{ background: isEqual && 'rgb(255,255,255,0.1)' }}
                                            className="list">
                                            <div className="channelList"><a href="javascript:void(0)" className="thumb">
                                                {
                                                    errorIndex === index ?
                                                        <img alt="placeholder" src={placeholderImage} /> :
                                                        adult && getParentalPin("currentUser") && (selectedCategory === 'Favourites' || selectedCategory === 'Channel History') ?
                                                            <img alt="placeholder"
                                                                style={{
                                                                    objectFit: 'contain',
                                                                    padding: '15px'
                                                                }}
                                                                src={lockIcon} />
                                                            :
                                                            stream.tvg.logo ?
                                                                <img
                                                                    src={stream.tvg.logo}
                                                                    onError={() => setErrorIndex(index)}
                                                                /> :
                                                                <img alt="placeholder" src={placeholderImage} />
                                                }
                                            </a><span className="info"><a href="javascript:void(0)"><strong>{stream.name}</strong>Program info Entertainment </a>
                                                    {isEqual &&
                                                        <Slider
                                                            className='live-stream-slider'
                                                            value={isEqual ? progress : 0}
                                                            size={"small"}
                                                            sx={{
                                                                width: "90%",
                                                                color: '#615DFC !important',
                                                            }}
                                                            disabled
                                                        />
                                                    }
                                                </span></div>
                                            <a className="favourite" id='favourite-el' href="javascript:void(0)"><svg onClick={() => handleFavourite(stream.url, isFavourite)} width="25" height="23" viewBox="0 0 25 23" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M24.7976 7.2086C24.7976 7.54497 24.7976 7.88134 24.7976 8.21745C24.785 8.2871 24.7666 8.35624 24.7611 8.42614C24.6679 9.60254 24.2942 10.6901 23.7202 11.7141C22.9972 13.0041 22.0421 14.1134 20.9974 15.1449C18.4649 17.6453 15.6791 19.8596 13.0023 22.197C12.6849 22.4744 12.3046 22.4572 11.9748 22.1827C11.698 21.9523 11.4259 21.7161 11.1547 21.4789C9.00273 19.5982 6.83161 17.7395 4.70792 15.8278C3.39096 14.6423 2.1868 13.3382 1.31572 11.7747C-0.14759 9.14833 -0.226068 6.48212 1.24456 3.83987C2.05937 2.37555 3.31753 1.39294 4.94058 0.933683C6.67188 0.443893 8.33151 0.62053 9.87507 1.58901C10.8574 2.20547 11.6059 3.05081 12.2188 4.02484C12.3094 4.16867 12.3977 4.31377 12.4631 4.41924C12.9281 3.81943 13.3354 3.18783 13.8459 2.65514C15.6448 0.778747 17.8308 0.205432 20.2936 1.01695C22.6116 1.78079 23.9556 3.49467 24.5549 5.81947C24.6717 6.27318 24.7184 6.74505 24.7976 7.2086Z" fill={isFavourite ? '#FF0000' : 'white'} /></svg></a>
                                        </div>
                                    }
                                    )
                                }

                                {
                                    (selectedCategory === "Favourites" && favouriteChannels.length === 0) ?
                                        <h1 className='no-category-found'>No Favourite Streams found !</h1> :
                                        (selectedCategory === "Channel History" && channelHistory.length === 0) ?
                                            <h1 className='no-category-found'>No Channel History found !</h1> :
                                            (currentLiveStreams.length === 0 && selectedCategory !== "Favourites" && selectedCategory !== "Channel History") ? <h1 className='no-category-found'>No Live streams found !</h1> : null
                                }
                            </div>
                        </div>
                        <div style={{
                            position: "relative"
                        }} className="steamDetail panel">
                            {
                                epgs.length === 0 && !playerSrc
                                    ?
                                    <CircularProgress className='loader-icon' />
                                    :
                                    <>
                                        <div className="videoPlay">
                                            {
                                                currentPlayer.player === "videojs" ?
                                                    <VideoJSPlayer
                                                        getFavouriteChannels={getFavouriteChannels}
                                                        opened={idExists}
                                                        favourites={favourites}
                                                        src={convertURL(playerSrc, 'm3u8')}
                                                        currentStreams={currentLiveStreams}
                                                        currentStream={currentStreamId}
                                                        playingStream={currentStream}
                                                        onPlayerReady={saveChannelHistroy}
                                                        restart={(index) => handleEpg(currentLiveStreams[index])}
                                                        onPreviousChannel={(index) => {
                                                            if (fullscreen) {
                                                                setIdExists(true);
                                                            };
                                                            handleEpg(currentLiveStreams[index - 1]);
                                                        }}
                                                        onNextChannel={(index) => {
                                                            if (fullscreen) {
                                                                setIdExists(true);
                                                            }
                                                            handleEpg(currentLiveStreams[index + 1])
                                                        }}
                                                        onfullscreen={e => setFullscreen(e)}
                                                        onclose={() => {
                                                            setIdExists(false);
                                                            setFullscreen(false)
                                                            router('/dashboard/live')
                                                        }}
                                                    /> :
                                                    <LiveTVPlayer
                                                        getFavouriteChannels={getFavouriteChannels}
                                                        opened={idExists}
                                                        favourites={favourites}
                                                        src={convertURL(playerSrc, 'm3u8')}
                                                        currentStreams={currentLiveStreams}
                                                        currentStream={currentStreamId}
                                                        playingStream={currentStream}
                                                        onPlayerReady={saveChannelHistroy}
                                                        restart={(index) => handleEpg(currentLiveStreams[index])}
                                                        onPreviousChannel={(index) => {
                                                            if (fullscreen) {
                                                                setIdExists(true);
                                                            };
                                                            handleEpg(currentLiveStreams[index - 1]);
                                                        }}
                                                        onNextChannel={(index) => {
                                                            if (fullscreen) {
                                                                setIdExists(true);
                                                            }
                                                            handleEpg(currentLiveStreams[index + 1])
                                                        }}
                                                        onfullscreen={e => setFullscreen(e)}
                                                        onclose={() => {
                                                            setIdExists(false);
                                                            setFullscreen(false)
                                                            router('/dashboard/live')
                                                        }}
                                                    />
                                            }

                                        </div>
                                        {
                                            epgs.length > 0 ?
                                                <div className="panel">
                                                    <div className="pHead">
                                                        <span className="h5">{currentStream?.name}</span>
                                                    </div>
                                                    <div className="pBody">
                                                        {epgs.map((epg, index) => {
                                                            const startTime = formattedStartTime(epg.start);
                                                            const endTime = formattedStartTime(epg.end) ? formattedStartTime(epg.end) : formattedStartTime(epg.stop);
                                                            const title = atob(epg.title);
                                                            if (startTime && endTime) {
                                                                return <span className={index === 0 ? "active" : ""} ><b>{startTime}</b>-<b>{endTime}</b> {title}</span>
                                                            }
                                                            return null
                                                        })
                                                        }
                                                    </div>
                                                </div> :
                                                <div className='no-epg-found'>
                                                    <p>No Epgs found related to this channel !</p>
                                                </div>
                                        }
                                    </>
                            }

                        </div>
                    </section>
                }
                <ParentalLock
                    action={"verify"}
                    close={() => setIsAdult(false)}
                    open={isAdult}
                    completed={handlePinVerified}
                />
                {idExists &&
                    <Backdrop sx={{
                        background: 'black',
                        position: "fixed",
                        top: 0,
                        zIndex: 9999,
                        left: 0,
                        width: '100%',
                        height: '100%'
                    }} open={true}>
                        <CircularProgress sx={{ color: "white" }} />
                    </Backdrop>}
            </>
    )
}

export default M3ULive