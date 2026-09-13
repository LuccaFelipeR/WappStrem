import React, { useState, useEffect, useContext, useRef } from 'react'
import DashboardHeader from '../../header';
import useApi from '../../../../hooks/useApi';
import { endpoint } from '../../../../config/endpoints';
import { AppContext } from '../../../../contexts/app';
import Loading from '../../../../helpers/loading';
import { Alert, Backdrop, CircularProgress, Slider } from '@mui/material';
import "./styles.css"
import LiveTVPlayer from '../player';
import { AES, enc } from 'crypto-js';
import { addToFavs, getFavourites, getRecents, removeFromFavs, removeMovieFromRecents, saveWatchedContent } from '../../../../firebase/functions';
import { DateTime } from "luxon";
// import { useRouter } from 'next/router';
import ParentalLock from '../../../../helpers/parentalLock';
import { getParentalPin } from '../../../../helpers/local';
import { Cancel } from '@mui/icons-material';
// import Image from 'next/image';
import noContentFound from "../../../../assets/noContentFound.svg"
import placeholderImage from "../../../../assets/placeholder.png"
import lockIcon from "../../../../assets/lockIcon.svg"
import VideoJSPlayer from '../../../../helpers/player2';
import { getDatabase, onValue, ref } from 'firebase/database';
import { app } from '../../../../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NoEpg from './noEpg';

const LiveTv = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const router = useNavigate();
    const liveStreamsRef = useRef(null);
    const epgContainerRef = useRef(null);
    const { makeRequest } = useApi();
    const view = searchParams.get("view");
    const { user, alert, streamData, currentPlayer, epgSrc } = useContext(AppContext);
    const { liveTv } = streamData;
    const [liveCategories, setLiveCategories] = useState([]);
    const [searchedCategories, setSearchedCategories] = useState([]);
    const [searchedChannels, setSearchedChannels] = useState([]);
    const [liveStreams, setLiveStreams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [currentLiveStreams, setCurrentLiveStreams] = useState([]);
    const [epgs, setEpgs] = useState([]);
    const [externalEgps, setExternalEgps] = useState([]);
    const [playerSrc, setPlayerSrc] = useState(null);
    const [favourites, setFavourites] = useState([]);
    const [progress, setProgress] = useState(0);
    const [currentStreamId, setCurrentStreamId] = useState(null);
    const [currentStream, setCurrentStream] = useState(null);
    const [timerStart, setTimerStart] = useState(false);
    const [favouriteChannels, setFavouriteChannels] = useState([]);
    const [channelHistory, setChannelHistory] = useState([]);
    const [searchOn, setSearchOn] = useState(false);
    const [searchChannelOn, setSearchChannelOn] = useState(false);
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
    const [searchedChannel, setSearchedChannel] = useState('');
    const [errorIndex, setErrorIndex] = useState(null);
    const [clickedAdultCtg, setClickedAdultCtg] = useState(null);
    const [screenWidth, setScreenWidth] = useState(0);
    const [currentEpg, setCurrentEpg] = useState(null);

    const database = getDatabase(app);


    useEffect(() => {
        if (user) {
            getLiveData(endpoint.getLiveCategories, setLiveCategories, "categories");
            getLiveData(endpoint.getLiveStreams, setLiveStreams, "streams");
            onValue(ref(database, `${user.dbAddress}/Fav/LiveTv`), (snapshot) => {
                getFavouriteChannels()
            });
            onValue(ref(database, `${user.dbAddress}/Recent/LiveTv`), (snapshot) => {
                getChannelHistory()
            });
        }
    }, [user]);

    useEffect(() => {
        if (user && liveTv.streams && selectedCategory) {
            // setCurrentLiveStreams([])
            getFavouriteChannels();
            getChannelHistory();
            getCurrentLiveStreams(false, false);
            liveStreamsRef.current.scrollTo(0, 500)
        }
    }, [user, liveTv.streams, selectedCategory])

    useEffect(() => {
        if (liveCategories.length > 0 && liveTv.streams) {
            if (view) {
                const categoryId = liveTv.streams.filter(stream => String(stream.stream_id) === String(view))[0].category_id ?
                    liveTv.streams.filter(stream => String(stream.stream_id) === String(view))[0].category_id :
                    liveTv.streams.filter(stream => String(stream.stream_id) === String(view))[0].categories[0];
                const foundedCategory = liveCategories.filter(ctg => String(ctg.category_id) === String(categoryId))[0]
                const currentStrm = liveTv.streams.filter(stream => String(stream.stream_id) === view)[0];
                setSelectedCategory(foundedCategory)
                setCurrentStreamId(view);
                setCurrentStream(currentStrm);

            } else {
                setSelectedCategory(liveCategories[0]);
                const streams = liveTv.streams.filter(stream => String(stream.category_id ? stream.category_id : (stream.categories && stream.categories.length > 0) ? stream.categories[0] : ( stream.category_ids && stream.category_ids.length>  0 ) ?   stream.category_ids[0]: null) === String(liveCategories[0].category_id ? liveCategories[0].category_id : liveCategories.categories[0]));
                setCurrentStreamId(streams[0].stream_id)
                setCurrentStream(streams[0])
                getCurrentLiveStreams(null, true)
            }
        }
    }, [liveCategories, liveTv.streams]);

    useEffect(() => {
        // setCurrentLiveStreams([]);
        if (selectedCategory && liveTv.streams && liveStreamsRef.current) {
            getCurrentLiveStreams(false, false);
            getChannelHistory();
            getFavouriteChannels();
            liveStreamsRef.current.scrollTo(0, 0);
        }
    }, [selectedCategory, liveTv.streams, liveStreamsRef]);

    // useEffect(() => {
    //     if (externalEgps.length > 0 && epgContainerRef.current && epgSrc.currentEpgSrc && epgSrc.currentEpgSrc.data) {
    //         currentProgress();
    //         setTimerStart(true)
    //         const currentEpgIndex = externalEgps.indexOf(externalEgps.filter(epg => {
    //             const isFinished = epg.timings.isTimePassed;
    //             const currentRunning = epg.timings.isWithinTime;
    //             return currentRunning;
    //         })[0]);
    //         const formattedEpgIndex = currentEpgIndex < 0 ? 1 : currentEpgIndex
    //             setCurrentEpg(externalEgps[currentEpgIndex]);
    //         epgContainerRef.current.scrollTo({
    //             top: (formattedEpgIndex) * (screenWidth > 768 ? 40 : 30),
    //             behavior: "smooth"
    //         })
    //     }
    // }, [externalEgps, epgContainerRef.current]);

    useEffect(() => {
        if (epgSrc.currentEpgSrc && epgSrc.currentEpgSrc.data && currentStream) {
            getShortEpg(currentStream.stream_id, false);
        }
    }, [epgSrc.currentEpgSrc, currentStream])

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
                    handleEpg(currentLiveStreams.filter(stream => String(stream.stream_id) === String(currentStreamId))[0])
                }, delay);
                return () => clearTimeout(timer);
            };

        }
    }, [currentStreamId, timerStart, epgs]);

    useEffect(() => {
        if (epgs.length > 0) {
            setCurrentEpg({
                ...epgs[0],
                start: formattedStartTime(epgs[0].start ? epgs[0].start : epgs[0].start_timestamp),
                end: formattedStartTime(epgs[0].stop ? epgs[0].stop : epgs[0].end ? epgs[0].end : epgs[0].timestamp),
                stop: formattedStartTime(epgs[0].stop ? epgs[0].stop : epgs[0].end ? epgs[0].end : epgs[0].timestamp),
            })
        }
    }, [epgs])

    useEffect(() => {
        setScreenWidth(window.innerWidth);
    }, []);

    const timeZone = (user && user.loginType !== 'm3u') ? JSON.parse(AES.decrypt(user.serverInfo, "thisisserverinfo").toString(enc.Utf8)).timezone : 'America/NewYork'

    function formatDateToYYYYMMDDHHMMSS(inputDate, notTimestamp) {
        if (notTimestamp) {
            const year = inputDate.slice(0, 4);
            const month = inputDate.slice(4, 6);
            const day = inputDate.slice(6, 8);
            const hours = inputDate.slice(8, 10);
            const minutes = inputDate.slice(10, 12);
            const seconds = inputDate.slice(12, 14);
            const formattedTimestamp = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;

            return formattedTimestamp;
        }

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

    function convertToTimezone(timestamp, dt) {
        // Extract date and time components from the timestamp
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const year = timestamp.slice(0, 4);
        const month = timestamp.slice(4, 6);
        const day = timestamp.slice(6, 8);
        const hour = timestamp.slice(8, 10);
        const minute = timestamp.slice(10, 12);
        const second = timestamp.slice(12, 14);
        let sign = timestamp.slice(15, 16); // Extract the sign
        let offsetHours = parseInt(timestamp.slice(16, 18).length > 0 ? timestamp.slice(16, 18) : 0); // Extract the hours
        // Create a Date object in UTC
        const utcDate = new Date(Date.UTC(year, month - 1, day, `${parseInt(hour) + (sign === "+" ? -offsetHours : offsetHours)}`, parseInt(minute), second));

        // Format the date to the target timezone in hh:mm am/pm format
        const options = {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };

        const formatter = new Intl.DateTimeFormat('en-US', options);
        const formattedDate = formatter.format(utcDate);
        if (dt) {
            return new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
        }
        return formattedDate;
    }

    function checkTimeConditions(startTimestamp, endTimestamp) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const startTime = convertToTimezone(startTimestamp, true);
        const endTime = convertToTimezone(endTimestamp, true);
        const currentTime = new Date().toLocaleString('en-US', { timeZone: timezone });

        const currentTimeObj = new Date(currentTime);

        const isWithinTime = currentTimeObj >= startTime && currentTimeObj <= endTime;
        const isTimePassed = currentTimeObj > endTime;

        return {
            isWithinTime,
            isTimePassed
        };
    }




    const formattedStartTime = (time) => {
        const dt = new Date(time).getTime();
        if (dt.toString() !== 'NaN') {
            if (user.loginType === 'one-stream-panel') {
                const parsedTime = formatDateToYYYYMMDDHHMMSS(dt)
                const foreignTime = DateTime.fromFormat(parsedTime, 'yyyy-MM-dd HH:mm:ss').toFormat('hh:mm a');
                return foreignTime;;
            } else {
                const parsedTime = formatDateToYYYYMMDDHHMMSS(dt)
                const foreignTime = DateTime.fromFormat(parsedTime, 'yyyy-MM-dd HH:mm:ss', { zone: timeZone });
                const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const indianTime = foreignTime.setZone(currentTimezone).toFormat('hh:mm a');
                return indianTime;

            }
        }
        return null

    }

    const getLiveData = async (endpoint, setFn, type) => {
        setLoading(true);
        try {
            const response = await makeRequest().get(endpoint);
            const data = user.loginType === "one-stream-panel" ? response.data.content : response.data;
            if (data === "Something went wrong!" || data?.length === 0) {
                setNoData(true);
                setFn([]);
            } else {
                setNoData(false);
                setFn(data);
                if (type === "streams") {
                    liveTv.toggle(data, "streams")
                }
                if (type === "categories") {
                    liveTv.toggle(data, "categories")
                }
            }
        } catch (error) {
            setLiveStreams(null)
            console.log('Error', error);
        }
        setLoading(false);
    }

    const adultCategories = ["adult", "xxx", "porn", "sex", "adults", "ADULTS", "+18", "18+", "18"];

    const getOneStreamURL = (id) => {
        return liveTv.streams.filter(stm => String(stm?.stream_id) === String(id))[0].links.m3u8
    }

    const isToday = (timestamp) => {
        // Parse the timestamp
        let year = parseInt(timestamp.slice(0, 4));
        let month = parseInt(timestamp.slice(4, 6)) - 1; // JavaScript months are 0-based
        let day = parseInt(timestamp.slice(6, 8));

        // Create a Date object for the provided timestamp
        let providedDate = new Date(year, month, day);

        // Get the current date
        let currentDate = new Date();

        // Compare the year, month, and day of the provided date with the current date
        return providedDate.getFullYear() === currentDate.getFullYear() &&
            providedDate.getMonth() === currentDate.getMonth() &&
            providedDate.getDate() === currentDate.getDate();
    }


    const getShortEpg = async (id, verified) => {
        setEpgs([]);
        setExternalEgps([]);
        const getCtgId = liveTv.streams.filter(stm => String(stm?.stream_id) === String(id))[0]?.category_id ?
            liveTv.streams.filter(stm => String(stm?.stream_id) === String(id))[0]?.category_id :
            liveTv.streams.filter(stm => String(stm?.stream_id) === String(id))[0]?.categories[0]
        const ctgName = liveTv.streamCategories.filter(ctg => String(ctg?.category_id) === String(getCtgId))[0]?.category_name;
        const epgChannelId = liveTv.streams.filter(stm => String(stm?.stream_id) === String(id))[0]?.epg_channel_id;
        const matchedProgramme = epgSrc?.data?.tv?.programme?.filter(programme => programme["$"].channel === epgChannelId).filter(epg => isToday(epg.$.start));
        setPlayerSrc(null);
        const adult = adultCategories.filter(ctg => ctgName.toLowerCase().includes(ctg.toLowerCase())).length > 0;

        const runEpg = async () => {

            try {
                const response = await makeRequest().get(endpoint.getEpg + `&stream_id=${id}`);
                const decryptedServerAddress = user?.server && AES.decrypt(user?.server, "thisisserveraddress").toString(enc.Utf8);
                const decryptedPassword = user?.password && AES.decrypt(user?.password, "thisispassword").toString(enc.Utf8);
                const username = user?.username;

                const streamUrl = `${decryptedServerAddress}/live/${username}/${decryptedPassword}/${id}.m3u8`;
                const { epg_listings } = response.data;
                const { loginType } = user
                if (epgSrc.currentEpgSrc && epgSrc.currentEpgSrc.data) {
                    if (matchedProgramme && matchedProgramme.length > 0) {
                        // const formattedEpgs = matchedProgramme.map(programme => { return { start: formatDateToYYYYMMDDHHMMSS(programme["$"].start, true), stop: formatDateToYYYYMMDDHHMMSS(matchedProgramme["$"].stop, true), title: btoa(programme.title[0]) } })
                        setExternalEgps(matchedProgramme.map(programme => ({
                            start: convertToTimezone(programme.$.start, false),
                            stop: convertToTimezone(programme.$.stop, false),
                            end: convertToTimezone(programme.$.stop, false),
                            timings: checkTimeConditions(programme.$.start, programme.$.stop),
                            title: btoa(programme.title[0]),
                            desc: btoa(programme.desc[0]),
                        })));
                    } else {
                        setExternalEgps([]);
                    }
                    // setEpgs(epg_listings ? epg_listings: [])
                } else {
                    setEpgs(epg_listings ? epg_listings : []);
                }
                setPlayerSrc(loginType === 'one-stream-panel' ? getOneStreamURL(id) : streamUrl)

            } catch (error) {
                console.log(error)
            }
        }
        if (pinVerified) {
            runEpg()
        } else {
            if (parentalPin) {
                setIsAdult(adult);
                if (!adult) {
                    runEpg()
                    setPinVerified(false);
                } else {
                    if (adult && verified) {
                        runEpg();
                        setIsAdult(false);
                        setPinVerified(false);
                    }
                }
            } else {
                runEpg();
            }
        }

    }

    const getCurrentLiveStreams = (type, firstLoad) => {
        const currentCategory = firstLoad ? liveTv.streamCategories[0] : selectedCategory;
        if (currentCategory.category_name !== "Favourites" && currentCategory.category_name !== "Channel History") {
            const streams = liveTv.streams.filter(stream =>
                String(stream?.category_id) === String(currentCategory?.category_id) ||
                stream?.categories?.filter(id => String(id) === String(currentCategory.category_id)).length > 0
            );
            setCurrentLiveStreams(streams);
            if (!view) {
                if (firstLoad) {
                    setCurrentStreamId(streams[0].stream_id);
                }
                if (!onceAutoPlayed) {
                    handleEpg(streams[0])
                    setCurrentStream(streams[0])
                    setOnceAutoPlayed(true);
                }
            };
            if (!onceAutoPlayed) {
                type !== 'fav' &&
                    getShortEpg(!view ? streams[0]?.stream_id : view, view ? true : pinVerified);
                setOnceAutoPlayed(true)
            }
        } else {
            if (currentCategory.category_name === "Favourites") {
                setCurrentLiveStreams(favouriteChannels);
            }
            else if (currentCategory.category_name === "Channel History") (
                setCurrentLiveStreams(channelHistory)
            )
        }
    }

    const getFavouriteChannels = async () => {
        try {
            const response = await getFavourites("LiveTv", user.dbAddress);
            const ids = response.val() ? Object.keys(response.val()) : [];
            const values = response.val() ? Object.values(response.val()) : [];
            const merge = () => {
                const mergedArr = []

                ids.forEach((id, index) =>
                    mergedArr.push({
                        id,
                        timestamp: values[index]
                    })
                );
                return mergedArr;
            }
            setFavourites(ids);
            let favouriteStreams = []
            merge().map(strm => {
                const matchedComp = liveTv.streams.filter(str => String(str.stream_id) === String(strm.id))[0];
                if (matchedComp) {
                    favouriteStreams.push({
                        ...matchedComp,
                        timestamp: strm.timestamp
                    });
                }
            });
            const sorted = favouriteStreams.sort(
                (objA, objB) => objB.timestamp - objA.timestamp
            );
            setFavouriteChannels(sorted);
        } catch (error) {
            setFavouriteChannels([])
        };
        // getCurrentLiveStreams('fav');
    };

    const getChannelHistory = async () => {
        try {
            const response = await getRecents("LiveTv", user.dbAddress);
            const ids = response.val() ? Object.keys(response.val()) : [];
            const values = response.val() ? Object.values(response.val()) : [];
            const merge = () => {
                const mergedArr = []

                ids.forEach((id, index) =>
                    mergedArr.push({
                        id,
                        timestamp: values[index]
                    })
                );
                return mergedArr;
            }
            let channelHistory = []
            merge().map(strm => {
                const matchedComp = liveTv.streams.filter(str => String(str.stream_id) === String(strm.id));
                if (matchedComp.length > 0) {
                    channelHistory.push({
                        ...matchedComp[0],
                        timestamp: strm.timestamp
                    });
                }
            });
            const sorted = channelHistory.sort(
                (objA, objB) => objB.timestamp - objA.timestamp
            );
            setChannelHistory(sorted)
        } catch (error) {
            setChannelHistory([])
        };
    }

    const handleEpg = (stream) => {
        const { stream_id } = stream;
        setPlayerSrc(null);
        getShortEpg(String(stream_id), pinVerified);
        setCurrentStreamId(String(stream_id));
        setCurrentStream(stream)
    };

    const handleSearch = e => {
        const { value } = e.target;
        setSearchedValue(value);
        let searchedEntries = liveTv.streamCategories.filter(ctg => ctg.category_name.toLowerCase().includes(value.toLowerCase()));
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

    const handleSearchChannels = (e) => {
        const { value } = e.target;
        setSearchedChannel(value);
        let searchedEntries = currentLiveStreams.filter(stream => stream.name.toLowerCase().includes(value.toLowerCase()));
        setSearchedChannels(searchedEntries);
        if (value.length === 0) {
            setSearchChannelOn(false);
        } else {
            setSearchChannelOn(true);
        }
    }

    const handleFavourite = async (id, isFavourite) => {
        if (isFavourite) {
            await removeFromFavs(id, "LiveTv", user.dbAddress);
        } else {
            await addToFavs(id, "LiveTv", user.dbAddress);
        }
        getFavouriteChannels();
        alert.toggle({
            title: `${isFavourite ? 'Removed from Favourites' : "Added To Favourites"}`,
            show: true,
            type: 'success'
        })
    };

    const currentProgress = () => {
        const { start, end } = epgSrc.currentEpgSrc && epgSrc.currentEpgSrc.data ? externalEgps[0] : epgs[0];
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
            getShortEpg(currentStreamId, true);
            setSelectedCategory(clickedAdultCtg);
        } else {
            setSelectedCategory(clickedAdultCtg);
        }
    }

    const handleClearSearch = (type) => {
        if (type === "ctg") {
            setSearchedValue("");
            setSearchOn(false);
            setSearchedCategories([]);
            setShowExtraCtg({
                favourite: true,
                channelHistory: true
            });
        } else {
            setSearchChannelOn(false);
            setSearchedChannel("");
            setSearchedChannels([])
        }

    };

    const handleLiveStream = (e, s) => {
        const clickedElement = e.target.tagName;
        const isFavourite = clickedElement === 'svg' || clickedElement === 'path';
        if (!isFavourite) {
            handleEpg(s)
            setCurrentEpg(null);
            setCurrentStream(s);

        }
    }

    const handleCategory = category => {
        setSearchChannelOn(false);
        setSearchedChannel("");
        setPinVerified(false)
        const adult = adultCategories.filter(ctg => category.category_name.toLowerCase().includes(ctg.toLowerCase())).length > 0;
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

    const removeChannelHistory = async (id) => {
        try {
            await removeMovieFromRecents(id, 'LiveTv', user.dbAddress, null);
            getChannelHistory()
        } catch (error) {
            console.log(error)
        }
    }

    const playerRef = React.useRef(null);


    return (


        loading ? <Loading /> :
            <>
                <DashboardHeader currentAction="live" />
                {noData ? < div className="no-data-found-container">
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
                                            <Cancel sx={{ zIndex: 9, ":hover": { cursor: "pointer" } }} onClick={() => handleClearSearch("ctg")} /> :
                                            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M24.1175 26.1783C17.3706 31.352 8.08155 29.4127 3.57637 23.2248C-0.68313 17.3743 0.0222769 9.14911 5.26344 4.18996C10.6336 -0.891038 18.8046 -1.19482 24.501 3.47881C30.3196 8.25287 31.6682 16.9694 26.8365 23.4239C26.9409 23.5359 27.0477 23.6578 27.162 23.7719C29.1119 25.7217 31.0609 27.6722 33.0147 29.6185C33.5862 30.1878 33.854 30.8417 33.6315 31.6459C33.2639 32.9734 31.6879 33.5093 30.5881 32.6788C30.431 32.5601 30.2915 32.4168 30.1513 32.277C28.2428 30.3722 26.335 28.4663 24.4296 26.5579C24.3115 26.4402 24.2163 26.3001 24.1175 26.1783ZM15.2969 25.2385C21.1588 25.229 25.8636 20.5245 25.8675 14.668C25.8717 8.79405 21.1448 4.07337 15.2667 4.08145C9.40626 4.08917 4.70179 8.79476 4.69757 14.6522C4.6937 20.528 9.41961 25.248 15.2969 25.2385Z" fill="#748BC8" /> </svg>
                                    }
                                    <input onChange={handleSearch} value={searchedValue} placeholder="Search by Category" />
                                </div>
                            </div>
                            <div className="pBody">
                                {
                                    showExtraCtg.favourite &&
                                    <a
                                        style={{ display: "flex", justifyContent: 'space-between', background: selectedCategory?.category_name === "Favourites" ? "var(--md-source)" : 'transparent' }}

                                        onClick={() => handleCategory({
                                            category_name: "Favourites"
                                        })} href="javascript:void(0)">Favourite
                                        <p className='live-stream-count'>{favouriteChannels.length}</p>

                                    </a>
                                }
                                {
                                    showExtraCtg.channelHistory &&
                                    <a
                                        style={{ display: "flex", justifyContent: 'space-between', background: selectedCategory?.category_name === "Channel History" ? "var(--md-source)" : 'transparent' }}

                                        onClick={() => handleCategory({
                                            category_name: "Channel History"
                                        })} href="javascript:void(0)">Channel History
                                        <p className='live-stream-count'>{channelHistory.length}</p>

                                    </a>
                                }

                                {
                                    (searchOn ? searchedCategories : liveCategories).map((category, index) => {
                                        const { category_name } = category;
                                        const isAdult = adultCategories.filter(ctg => category_name.toLowerCase().includes(ctg)).length > 0;
                                        console.log("liveTv.streams",liveTv.streams.filter(stream => !stream.category_id))
                                        const count = liveTv.streams && liveTv.streams.filter(stream => String(stream.category_id ? stream.category_id : (stream.categories && stream.categories.length > 0) ? stream.categories[0] : (stream.category_ids && stream.category_ids.length > 0) ? stream.category_ids[0]: null) === String(category.category_id)).length;

                                        return <a
                                            key={index}
                                            style={{ display: "flex", justifyContent: 'space-between' }}
                                            className={category_name === selectedCategory?.category_name ? 'active' : ''}
                                            onClick={() => handleCategory(category)} href="javascript:void(0)">
                                            {category_name}
                                            {/* <img src='/parentalLock.svg' alt='parental-lock-icon' /> */}
                                            <svg display={(isAdult && parentalPin) ? "block" : "none"} width="20" height="26" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.35342 0.978516C9.71046 0.978516 10.0675 0.978516 10.4246 0.978516C10.6069 1.0108 10.7891 1.04529 10.972 1.07454C13.6371 1.50415 15.8459 3.8255 16.0656 6.51604C16.1583 7.65313 16.1075 8.80208 16.1216 9.94578C16.1229 10.0653 16.1218 10.1847 16.1218 10.3277C16.3536 10.3277 16.5625 10.3274 16.7714 10.3277C18.2385 10.3296 19.2373 11.3213 19.2379 12.7826C19.2392 16.337 19.239 19.8918 19.2379 23.4462C19.2373 24.9108 18.2409 25.908 16.7791 25.9094C15.3184 25.9108 13.8576 25.9097 12.3969 25.9097C9.24001 25.9097 6.08316 25.9124 2.92631 25.9083C1.60326 25.9066 0.549224 24.9067 0.545085 23.6167C0.533772 19.9486 0.535152 16.2805 0.545085 12.6123C0.54812 11.4981 1.37617 10.547 2.47545 10.3743C2.8554 10.3147 3.24694 10.3277 3.65641 10.3061C3.65641 10.2176 3.65641 10.1301 3.65641 10.0429C3.65696 9.06089 3.64813 8.07888 3.65972 7.09714C3.69007 4.49186 5.41763 2.12443 7.89129 1.3179C8.36506 1.16338 8.86531 1.08944 9.35342 0.978516ZM14.04 10.321C14.04 9.49768 14.0469 8.69612 14.0372 7.89484C14.0314 7.42549 14.0414 6.95007 13.9718 6.48817C13.6457 4.31968 11.4524 2.74195 9.29354 3.10037C7.17969 3.45107 5.74929 5.12373 5.73853 7.26407C5.73384 8.20498 5.73743 9.14615 5.73798 10.0871C5.73798 10.1638 5.7446 10.2405 5.74819 10.321C8.51957 10.321 11.2598 10.321 14.04 10.321ZM9.88457 14.4809C8.99416 14.4842 8.19481 15.0664 7.91475 15.9154C7.63634 16.7589 7.92192 17.6764 8.65147 18.2081C8.81095 18.3242 8.86062 18.4412 8.85786 18.628C8.8482 19.293 8.85206 19.958 8.85593 20.623C8.85675 20.7515 8.86282 20.8848 8.89732 21.0073C9.03279 21.4883 9.51318 21.8086 9.9897 21.749C10.5222 21.6822 10.9071 21.2879 10.9174 20.7609C10.9312 20.0557 10.9295 19.3498 10.9187 18.6443C10.9157 18.4478 10.967 18.3253 11.1326 18.2036C11.8607 17.6681 12.1408 16.7523 11.8583 15.908C11.5735 15.0553 10.7742 14.4776 9.88457 14.4809Z" fill="white" />
                                            </svg>
                                            {count > 0 && <p className='live-stream-count'>{count}</p>}

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
                            {/* <div className="pHead">
                                <span className="h5">{selectedCategory?.category_name}</span>
                            </div> */}
                            <div className="pHead">
                                <div className="controls">
                                    {
                                        searchedChannel.length > 0 ? <Cancel sx={{ zIndex: 9, ":hover": { cursor: "pointer" } }} onClick={() => handleClearSearch("channels")} /> :
                                            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M24.1175 26.1783C17.3706 31.352 8.08155 29.4127 3.57637 23.2248C-0.68313 17.3743 0.0222769 9.14911 5.26344 4.18996C10.6336 -0.891038 18.8046 -1.19482 24.501 3.47881C30.3196 8.25287 31.6682 16.9694 26.8365 23.4239C26.9409 23.5359 27.0477 23.6578 27.162 23.7719C29.1119 25.7217 31.0609 27.6722 33.0147 29.6185C33.5862 30.1878 33.854 30.8417 33.6315 31.6459C33.2639 32.9734 31.6879 33.5093 30.5881 32.6788C30.431 32.5601 30.2915 32.4168 30.1513 32.277C28.2428 30.3722 26.335 28.4663 24.4296 26.5579C24.3115 26.4402 24.2163 26.3001 24.1175 26.1783ZM15.2969 25.2385C21.1588 25.229 25.8636 20.5245 25.8675 14.668C25.8717 8.79405 21.1448 4.07337 15.2667 4.08145C9.40626 4.08917 4.70179 8.79476 4.69757 14.6522C4.6937 20.528 9.41961 25.248 15.2969 25.2385Z" fill="#748BC8" /> </svg>
                                    }
                                    <input onChange={handleSearchChannels} value={searchedChannel} placeholder="Search by Channel Name" />
                                </div>
                            </div>
                            <div className="pBody" ref={liveStreamsRef}>
                                {
                                    (selectedCategory?.category_name === "Favourites" ? favouriteChannels : selectedCategory?.category_name === "Channel History" ? channelHistory : (searchChannelOn ? searchedChannels : currentLiveStreams)).map((stream, index) => {
                                        const { stream_id } = stream;
                                        const isFavourite = favourites.filter(id => String(id) === String(stream_id)).length > 0;
                                        const isEqual = String(stream_id) === String(currentStreamId);
                                        const ctgName = liveTv.streamCategories.filter(ctg => String(ctg.category_id) === String(stream.category_id ? stream.category_id : (stream.categories && stream.categories.length > 0) ? stream.categories[0] : stream.category_ids[0]))[0]?.category_name;
                                        const adult = adultCategories.filter(ctg => ctgName.toLowerCase().includes(ctg.toLowerCase())).length > 0;

                                        return <div key={index} onClick={(e) => handleLiveStream(e, stream)} style={{ background: isEqual && 'rgb(255,255,255,0.1)' }} className="list">
                                            <div className="channelList"><a href="javascript:void(0)" className="thumb">
                                                {
                                                    errorIndex === index ?
                                                        <img alt="placeholder" src={placeholderImage} /> :
                                                        adult && getParentalPin("currentUser") && (selectedCategory.category_name === 'Favourites' || selectedCategory.category_name === 'Channel History') ?
                                                            <img alt="placeholder"
                                                                style={{
                                                                    objectFit: 'contain',
                                                                    padding: '15px'
                                                                }}
                                                                src={lockIcon} />
                                                            :
                                                            stream.stream_icon ?
                                                                <img
                                                                    src={stream.stream_icon}
                                                                    onError={() => setErrorIndex(index)}
                                                                /> :
                                                                <img alt="placeholder" src={placeholderImage} />
                                                }
                                            </a><span className="info"><a href="javascript:void(0)"><strong>{stream.name}</strong>{isEqual && currentEpg && atob(currentEpg.title).slice(0, 100)} {isEqual && currentEpg && atob(currentEpg.title).length > 100 && "..."}</a>
                                                    {/* {isEqual && epgs.length > 0 &&  
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
                                                    } */}
                                                </span></div>
                                            {
                                                <div className='fav-and-delete' style={{ display: 'flex', position: 'absolute', top: 6, right: 10, gap: 10, padding: 5 }}>
                                                    <svg stroke='white' strokeWidth={1} onClick={() => handleFavourite(stream.stream_id, isFavourite)} width="25" height="23" viewBox="0 0 25 23" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M24.7976 7.2086C24.7976 7.54497 24.7976 7.88134 24.7976 8.21745C24.785 8.2871 24.7666 8.35624 24.7611 8.42614C24.6679 9.60254 24.2942 10.6901 23.7202 11.7141C22.9972 13.0041 22.0421 14.1134 20.9974 15.1449C18.4649 17.6453 15.6791 19.8596 13.0023 22.197C12.6849 22.4744 12.3046 22.4572 11.9748 22.1827C11.698 21.9523 11.4259 21.7161 11.1547 21.4789C9.00273 19.5982 6.83161 17.7395 4.70792 15.8278C3.39096 14.6423 2.1868 13.3382 1.31572 11.7747C-0.14759 9.14833 -0.226068 6.48212 1.24456 3.83987C2.05937 2.37555 3.31753 1.39294 4.94058 0.933683C6.67188 0.443893 8.33151 0.62053 9.87507 1.58901C10.8574 2.20547 11.6059 3.05081 12.2188 4.02484C12.3094 4.16867 12.3977 4.31377 12.4631 4.41924C12.9281 3.81943 13.3354 3.18783 13.8459 2.65514C15.6448 0.778747 17.8308 0.205432 20.2936 1.01695C22.6116 1.78079 23.9556 3.49467 24.5549 5.81947C24.6717 6.27318 24.7184 6.74505 24.7976 7.2086Z" fill={isFavourite ? '#FF0000' : 'none'} /></svg>
                                                    {
                                                        selectedCategory?.category_name === "Channel History" &&

                                                        <svg onClick={() => removeChannelHistory(stream.stream_id)} width="17" height="24" viewBox="0 0 30 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M2.70855 11.3789C11.0812 11.3789 19.3939 11.3789 27.7294 11.3789C27.7446 11.4827 27.7696 11.5774 27.7704 11.6722C27.7802 15.5732 27.8673 19.4765 27.7704 23.3744C27.6984 26.2888 27.4331 29.201 27.1725 32.1063C26.9504 34.5827 24.8378 36.5468 22.3538 36.5695C17.6124 36.6135 12.871 36.615 8.12965 36.5695C5.54262 36.5445 3.4451 34.4356 3.27006 31.8585C3.09577 29.2881 2.90178 26.7193 2.7184 24.1489C2.70703 23.9928 2.70779 23.8359 2.70779 23.6791C2.70703 19.7637 2.70703 15.8475 2.70703 11.9321C2.70855 11.7646 2.70855 11.5964 2.70855 11.3789Z" fill="white" />
                                                            <path d="M15.2806 8.74084C10.9954 8.74084 6.70943 8.74615 2.42423 8.73099C2.08399 8.72948 1.70511 8.6537 1.41261 8.49078C0.801085 8.14978 0.545716 7.47612 0.715457 6.89415C0.9049 6.24323 1.54219 5.75825 2.25222 5.75371C3.63288 5.74537 5.0143 5.74007 6.39496 5.75901C6.72004 5.76356 6.90797 5.66505 7.07999 5.38846C7.69454 4.39805 8.32955 3.41977 8.96987 2.44603C9.88298 1.05855 11.1871 0.261373 12.833 0.185595C14.5516 0.106029 16.2809 0.0984515 17.9995 0.185595C19.9076 0.28259 21.2427 1.3662 22.1665 2.98481C22.5893 3.72591 22.9932 4.47913 23.3653 5.246C23.5494 5.62564 23.7654 5.77492 24.2056 5.76356C25.5575 5.72794 26.9109 5.73931 28.2628 5.75446C29.3282 5.76659 29.9981 6.60544 29.7722 7.60722C29.6374 8.20813 29.1372 8.65976 28.5212 8.72266C28.3234 8.74312 28.1233 8.73933 27.924 8.73933C23.7093 8.74084 19.4953 8.74084 15.2806 8.74084ZM20.4471 5.72491C20.125 5.20432 19.784 4.75951 19.5559 4.26317C19.1339 3.34323 18.4223 2.9545 17.4531 2.95146C15.9732 2.94768 14.4933 2.9454 13.0133 2.95222C12.3556 2.95525 11.7524 3.1697 11.3531 3.69105C10.8742 4.31621 10.4763 5.00427 10.0042 5.72415C13.5188 5.72491 16.9409 5.72491 20.4471 5.72491Z" fill="white" />
                                                        </svg>
                                                    }
                                                </div>
                                            }


                                        </div>
                                    }
                                    )
                                }

                                {
                                    (selectedCategory?.category_name === "Favourites" && favouriteChannels.length === 0) ?
                                        <h1 className='no-category-found'>No Favourite Streams found !</h1> :
                                        (selectedCategory?.category_name === "Channel History" && channelHistory.length === 0) ?
                                            <h1 className='no-category-found'>No Channel History found !</h1> :
                                            (currentLiveStreams.length === 0 && selectedCategory?.category_name !== "Favourites" && selectedCategory?.category_name !== "Channel History") ? <h1 className='no-category-found'>No Live streams found !</h1> : null
                                }
                                {
                                    (searchChannelOn && searchedChannels.length === 0) &&
                                    <h1 className='no-category-found'>No Live Streams Found !</h1>
                                }
                            </div>
                        </div>
                        <div style={{
                            position: "relative"
                        }} className="steamDetail panel">
                            {
                                // (epgSrc.currentEpgSrc && epgSrc.currentEpgSrc.data ? externalEgps.length === 0 :
                                epgs.length === 0 && !playerSrc
                                    ?
                                    <CircularProgress className='loader-icon' />
                                    :
                                    <>
                                        <div className="videoPlay">
                                            {
                                                currentPlayer.player === 'videojs' ?
                                                    <VideoJSPlayer
                                                        opened={idExists}
                                                        src={playerSrc}
                                                        currentEpg={currentEpg}
                                                        favourites={favourites}
                                                        currentStreams={currentLiveStreams}
                                                        currentStream={currentStream}
                                                        getFavouriteChannels={getFavouriteChannels}
                                                        onPlayerReady={saveChannelHistroy}
                                                        restart={(index) => handleEpg(currentLiveStreams[index])}
                                                        onPreviousChannel={(index) => {
                                                            if (fullscreen) {
                                                                setIdExists(true);
                                                            }
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
                                                        opened={idExists}
                                                        currentEpg={currentEpg}
                                                        src={playerSrc}
                                                        favourites={favourites}
                                                        currentStreams={currentLiveStreams}
                                                        currentStream={currentStream}
                                                        getFavouriteChannels={getFavouriteChannels}
                                                        onPlayerReady={saveChannelHistroy}
                                                        restart={(index) => handleEpg(currentLiveStreams[index])}
                                                        onPreviousChannel={(index) => {
                                                            if (fullscreen) {
                                                                setIdExists(true);
                                                            }
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
                                            // (epgSrc.currentEpgSrc && epgSrc.currentEpgSrc.data ? externalEgps.length > 0 : 
                                            epgs.length > 0 ?
                                                <div className="panel">
                                                    <div className="pHead">
                                                        <span className="h5">{currentStream?.name}</span>
                                                    </div>
                                                    <div className="pBody" ref={epgContainerRef} >

                                                        {
                                                            // epgSrc.currentEpgSrc && epgSrc.currentEpgSrc.data ?
                                                            //     externalEgps.map((epg, index) => {
                                                            //         const currentRunning = epg.timings.isWithinTime;
                                                            //         const startTime = epg.start;
                                                            //         const endTime = epg.stop;
                                                            //         const title = atob(epg.title);
                                                            //         if (startTime && endTime) {
                                                            //             return <span key={index} style={{
                                                            //                 color: (currentRunning) ? "white" : "lightgray",
                                                            //                 fontSize: (currentRunning) ? "22px" : "19px",
                                                            //                 fontWeight: (currentRunning) ? "bold" : "normal",
                                                            //             }} ><b>{startTime}</b>-<b>{endTime}</b> {title}</span>
                                                            //         }
                                                            //         return null
                                                            //     }) :
                                                            epgs.map((epg, index) => {

                                                                const startTime = formattedStartTime(epg.start ? epg.start : epg.start_timestamp);
                                                                const endTime = formattedStartTime(epg.stop ? epg.stop : epg.end ? epg.end : epg.timestamp);
                                                                const title = atob(epg.title);
                                                                if (startTime && endTime) {
                                                                    return <span className={index === 0 ? "active" : ""} ><b>{startTime}</b>-<b>{endTime}</b> {title}</span>
                                                                }
                                                                return null
                                                            })
                                                        }
                                                    </div>
                                                </div> :
                                                <NoEpg />
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

export default LiveTv