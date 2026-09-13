import { endpoint } from '../../../../config/endpoints';
import { Backdrop, CircularProgress } from '@mui/material';
// import { useRouter } from 'next/router'
import React, { useEffect, useState, useContext, useRef } from 'react'
import "./styles.css"
import DashboardHeader from '../../header';
import { AppContext } from '../../../../contexts/app';
import useApi from '../../../../hooks/useApi';
import VideoJsPlayer from '../../../../helpers/player/videojs';
import { AES, enc } from 'crypto-js';
import { addToFavs, getParticluarTimeline, getValue, removeFromFavs } from '../../../../firebase/functions';
import ReactPlayer from 'react-player';
import { CloseOutlined } from '@mui/icons-material';
import ParentalLock from '../../../../helpers/parentalLock';
import Loading from '../../../../helpers/loading';
import Watched from '../../../../helpers/progress';
import placeholder from "../../../../assets/placeholder.png"
// import Image from 'next/image';
import Player from '../../../../helpers/player';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const SeriesPreview = () => {
    const [searchParams,setSearchParams] = useSearchParams();
    const router = useNavigate();
    const {item} = useParams();
    const state = searchParams.get("state");
    const reactPlayerRef = useRef(null);
    const { makeRequest } = useApi();
    const { user, alert, streamData, parentalVerified, currentPlayer } = useContext(AppContext)
    const [series, setSeries] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [playerOpen, setPlayerOpen] = useState(false);
    const [streamUrl, setStreamUrl] = useState("");
    const [currentEpisode, setCurrentEpisode] = useState(0);
    const [episodes, setEpisodes] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPlaying, setCurrentPlaying] = useState(0)
    const [addedToFav, setAddedToFav] = useState(false);
    const [finalAddress, setFinalAddress] = useState(null);
    const [showTrailer, setShowTrailer] = useState(false);
    const [ytPlayerReady, setYtPlayerReady] = useState(false);
    const [watchedEpisodes, setWatchedEpisodes] = useState({
        episodes: [],
        keys: []
    });
    const [timeline, setTimeline] = useState(0);
    const [adult, setAdult] = useState(false);
    const [watchedEpisode, setWatchedEpisode] = useState({
        episodeId: '',
        watched: 0
    });
    const [addingToFav, setAddingToFav] = useState(false);
    const [currentKeys, setCurrentKeys] = useState(null);



    const secondsToHms = (d) => {
        d = Number(d);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);

        var hDisplay = h > 0 ? h + (h == 1 ? "h" : "h") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? "min" : " min") : "";
        return hDisplay + " " + mDisplay;
    }

    const getEpisodeTimeline = async (action, episodeId, fetchData) => {
        setLoading(true);
        try {
            const response = await getParticluarTimeline(item, 'Series', finalAddress);
            if (response.val()) {
                const recentEpisodes = Object.values(response.val());
                const epsdKeys = Object.keys(response.val());
                if (fetchData) {
                    setWatchedEpisodes({
                        episodes: response.val(),
                        keys: epsdKeys
                    });
                } else {

                    const formattedRecentEpisodes = recentEpisodes.slice(0, recentEpisodes.length - 1);
                    const lastWatched = formattedRecentEpisodes.filter(epsd => epsd.lastWatched === 'true')[0];
                    const index = formattedRecentEpisodes.indexOf(lastWatched);
                    const { season, timeline, duration } = action === 'next' ? response.val()[user.loginType === "one-stream-panel" ? String(episodeId) : Number(episodeId)] : lastWatched;
                    const episode = epsdKeys[index]
                    const watchedTime = (timeline / duration) * 100;
                    setWatchedEpisodes({
                        episodes: response.val(),
                        keys: epsdKeys
                    });
                    setSelectedSeason(Number(season));
                    setTimeline(timeline);
                    const watchedEp = {
                        episodeId: episode,
                        watched: watchedTime
                    }
                    if (action === 'play') {

                        handlePlay(series.episodes[Number(season)].filter(epsd => epsd.id === episode)[0], {
                            episodes: response.val(),
                            keys: epsdKeys
                        });

                    } else {
                        if (response.val() && state === 'play') {
                            handlePlay(series.episodes[Number(season)].filter(epsd => epsd.id === episode)[0], {
                                episodes: response.val(),
                                keys: epsdKeys
                            });
                        }
                    }
                    setWatchedEpisode({
                        episodeId: episode,
                        watched: watchedTime
                    });
                }

            } else {
                setSelectedSeason(1)
                if (action === "play") {

                    handlePlay(series.episodes[1][0], null)
                }
                setWatchedEpisode({
                    episodeId: "",
                    watched: 0
                });
                setWatchedEpisodes({
                    episodes: [],
                    keys: []
                })
            }

        } catch (error) {
            console.log(error)
        }
        setLoading(fetchData ? true : false)
    }

    useEffect(() => {
        if (item && user) {
            setFinalAddress(user.dbAddress);
            getSeries();
            setCurrentKeys(() => {
                if (user.loginType === "one-stream-panel") {
                    return {
                        releaseDate: 'release_date'
                    }
                } else {
                    return {
                        releaseDate: 'releaseDate'
                    }
                }

            })
        }
    }, [item, user, state]);

    useEffect(() => {
        if (finalAddress) {
            checkFav(finalAddress)
        }
    }, [finalAddress])


    useEffect(() => {
        if (series) {
            setEpisodes(series.episodes[selectedSeason]);

        }
    }, [selectedSeason, series])

    useEffect(() => {
        if (series) {
            getEpisodeTimeline();
            if (getParentalPin("currentUser") && !parentalVerified.status) {
                isAdult();
            }
        }
    }, [series])

    useEffect(() => {
        if (state !== 'play') {
            setPlayerOpen(false)
        }
    }, [state]);

    const getParentalPin = (key) => {
        if (!key || typeof window === 'undefined') {
            return ""
        }
        const retrievedUser = Object.values(JSON.parse(localStorage.getItem(key)))[0].parentalPin;
        return retrievedUser;
    }

    const isAdult = async () => {
        const adultArray = ["adult", "xxx", "porn", "sex", "adults", "ADULTS", "+18", "18+", "18"];
        const parentalPin = getParentalPin('currentUser');
        if (parentalPin) {
            if (streamData.series.streamCategories) {
                let adultCategoryIds = [];
                adultArray.map(item => {
                    const adultCategoryId = streamData.series.streamCategories.filter(ctg => ctg.category_name.toLowerCase().includes(item.toLowerCase()))[0]?.category_id;
                    if (adultCategoryId) {
                        adultCategoryIds.push(adultCategoryId)
                    }
                });
                if (adultCategoryIds.filter(id => String(id) === String(series.info.category_id)).length > 0) {
                    setAdult(true);
                } else {
                    setAdult(false);
                }
            } else {
                try {
                    const response = await makeRequest().get(endpoint.getSeriesCategories);
                    const categories = response.data.message;
                    let adultCategoryIds = [];
                    adultArray.map(item => {
                        const adultCategoryId = categories.filter(ctg => ctg.category_name.toLowerCase().includes(item.toLowerCase()))[0]?.category_id;
                        if (adultCategoryId) {
                            adultCategoryIds.push(adultCategoryId);
                        }
                    });
                    if (adultCategoryIds.filter(id => String(id) === String(series.info.category_id)).length > 0) {
                        setAdult(true);
                    } else {
                        setAdult(false);
                    }
                } catch (error) {
                    console.log(error);
                    setAdult(false);
                }

            }

        } else {
            setAdult(false)
        }

    }

    const getSeries = async () => {
        try {
      
            const response = await makeRequest().get(`${endpoint.getSerie}&series_id=${item}`);
            setSeries(response.data);
        } catch (error) {
            console.log(error)
        }
    }

    const handleFavourites = async () => {
        setAddingToFav(true);
        if (addedToFav) {
            try {
                await removeFromFavs(item, "Series", finalAddress);
                alert.toggle({
                    title: "Removed from favourites",
                    show: true,
                    type: "success"
                })
            } catch (error) {
                console.log(error);
                alert.toggle({
                    title: "Something went wrong",
                    show: true,
                    type: "error"
                })
            }
            checkFav(finalAddress);
            setAddingToFav(false);

        } else {
            try {
                await addToFavs(item, "Series", finalAddress);
                alert.toggle({
                    title: "Added to favourites",
                    show: true,
                    type: "success"
                })
            } catch (error) {
                console.log(error);
                alert.toggle({
                    title: "Something went wrong",
                    show: true,
                    type: "error"
                })
            }
            checkFav(finalAddress);
            setAddingToFav(false);

        }
    };

    const checkFav = async (address) => {
        try {
            const response = await getValue(item, "Series", address);
            const added = await response.val();
            setAddedToFav(added)
        } catch (error) {
            console.log(error);
        }
    }

    const Episode = ({ episode }) => {
        const isWatched = watchedEpisodes.keys.filter(key => String(key) === String(episode.id)).length > 0;
        const watched = isWatched && (watchedEpisodes.episodes[episode.id].timeline / watchedEpisodes.episodes[episode.id].duration) * 100;
        const ratingCount = Math.round(episode.info.rating ? episode.info.rating : 0 / 2)
        const rating = () => Array(ratingCount).fill(1).map(() => <svg width="35" height="33" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0.479492 12.8428C0.667049 12.2289 0.995185 11.7264 1.62263 11.4926C2.17676 11.2861 2.77003 11.32 3.34658 11.2634C4.9531 11.1057 6.56103 10.9658 8.16861 10.8203C9.24057 10.7231 10.3118 10.6188 11.3848 10.5388C11.7073 10.5146 11.8991 10.4306 12.0397 10.096C13.2277 7.26702 14.4434 4.4494 15.646 1.62679C16.1741 0.386855 17.5023 -0.016018 18.4935 0.771578C18.786 1.00398 18.9583 1.31752 19.1028 1.65527C20.3203 4.50777 21.5442 7.35742 22.7564 10.2121C22.8404 10.4103 22.939 10.5021 23.1543 10.5203C24.9708 10.674 26.7869 10.8335 28.6023 10.9982C29.9583 11.1214 31.3143 11.2452 32.6684 11.3869C33.4194 11.4652 33.9255 11.8969 34.1611 12.6019C34.4031 13.3261 34.2212 13.9831 33.6575 14.4896C32.4069 15.6131 31.1356 16.7139 29.8718 17.8229C28.7401 18.8158 27.6101 19.8102 26.4716 20.795C26.3168 20.9288 26.2862 21.0434 26.3317 21.2427C27.0318 24.2977 27.7194 27.3559 28.4155 30.412C28.5959 31.2042 28.4176 31.8761 27.766 32.3793C27.1517 32.8538 26.3969 32.8584 25.6701 32.4238C22.986 30.8191 20.3011 29.2158 17.6215 27.6036C17.434 27.4908 17.3073 27.4922 17.1197 27.605C14.4299 29.2211 11.7372 30.8333 9.03842 32.4345C7.81022 33.1634 6.42401 32.4897 6.25318 31.1006C6.2272 30.8889 6.2571 30.6814 6.30265 30.4792C6.98704 27.4545 7.67071 24.429 8.37254 21.4082C8.44977 21.0761 8.38321 20.8871 8.12448 20.6626C5.78304 18.6325 3.45905 16.5826 1.12437 14.5447C0.797307 14.2589 0.634663 13.8863 0.480204 13.5016C0.479492 13.2827 0.479492 13.0628 0.479492 12.8428Z" fill="#FEC007" /> </svg>);
        return <div class="list">
            {/* <a href="#" class="downloadBtn"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12.9128 16.8231C12.9128 16.647 12.9128 16.5365 12.9128 16.4264C12.9128 11.9579 12.9116 7.48924 12.9136 3.02082C12.9142 1.87218 13.7405 1.00809 14.8322 1.00198C15.8809 0.996171 16.7502 1.82364 16.7743 2.87259C16.7909 3.58671 16.779 4.30171 16.7792 5.01612C16.7795 8.82041 16.7792 12.6247 16.7792 16.429C16.7792 16.5394 16.7792 16.6496 16.7792 16.8039C16.8679 16.7435 16.9324 16.7071 16.9879 16.6603C18.3915 15.4835 19.7959 14.3078 21.1956 13.1266C21.7025 12.6988 22.2684 12.4954 22.9279 12.6459C23.7158 12.8258 24.2245 13.3307 24.4355 14.0942C24.6474 14.8615 24.4233 15.5405 23.8152 16.0503C21.2477 18.2037 18.6734 20.3492 16.0924 22.4867C15.3641 23.0898 14.3189 23.0834 13.5847 22.475C10.9968 20.3303 8.41411 18.179 5.83868 16.0192C4.9868 15.3048 4.89088 14.1241 5.58117 13.2941C6.2578 12.48 7.5163 12.3349 8.35046 13.0188C9.79033 14.1988 11.2075 15.4065 12.6346 16.6019C12.7096 16.6647 12.7875 16.7234 12.9128 16.8231Z" fill="#D59FFF" /> <path d="M14.8776 24.1955C17.8678 24.1955 20.8577 24.1897 23.8479 24.1981C25.2392 24.2022 26.1605 25.549 25.6664 26.8285C25.3752 27.5821 24.6774 28.057 23.8313 28.0596C22.2708 28.0643 20.7103 28.0611 19.1498 28.0611C14.7401 28.0611 10.3304 28.062 5.92101 28.0605C4.9735 28.0602 4.22595 27.528 3.97454 26.6855C3.60106 25.4339 4.51863 24.2033 5.84689 24.1978C8.0314 24.1891 10.2162 24.1952 12.401 24.1952C13.2264 24.1955 14.0522 24.1955 14.8776 24.1955Z" fill="#D59FFF" /> </svg></a> */}
            <div class="listLink">
                <div onClick={() => handlePlay(episode, null)} class="thumb">
                    {
                        watched &&
                        <Watched progress={watched} />
                    }
                    <svg width="167" height="167" viewBox="0 0 167 167" fill="none" xmlns="http://www.w3.org/2000/svg"> <g filter="url(#filter0_d_361_4267)"> <rect x="27" y="27" width="113.01" height="113.01" rx="56.505" fill="black" fill-opacity="0.8" /> <rect x="28.5" y="28.5" width="110.01" height="110.01" rx="55.005" stroke="white" stroke-opacity="0.7" stroke-width="3" /> <path d="M68.5371 63.3047C68.854 63.3047 69.1705 63.3047 69.4873 63.3047C70.4095 63.4923 71.277 63.8164 72.0956 64.2865C81.0342 69.419 89.9788 74.541 98.9106 79.6844C99.5548 80.0555 100.174 80.5129 100.702 81.0342C102.145 82.4603 102.206 84.301 100.933 85.8705C100.374 86.559 99.6583 87.0485 98.8993 87.4839C89.9697 92.6055 81.0428 97.7316 72.1046 102.837C71.46 103.205 70.7503 103.499 70.0348 103.695C68.0982 104.226 66.4374 103.344 65.7151 101.477C65.3806 100.612 65.3127 99.707 65.3127 98.7939C65.3109 88.647 65.3109 78.5005 65.3141 68.3535C65.3141 67.9453 65.3281 67.534 65.3756 67.1289C65.5053 66.0187 65.8425 64.9958 66.6743 64.1907C67.1978 63.6835 67.8523 63.4652 68.5371 63.3047Z" fill="white" /> </g> <defs> <filter id="filter0_d_361_4267" x="0.493332" y="0.493332" width="166.023" height="166.023" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"> <feFlood flood-opacity="0" result="BackgroundImageFix" /> <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" /> <feOffset /> <feGaussianBlur stdDeviation="13.2533" /> <feComposite in2="hardAlpha" operator="out" /> <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" /> <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_361_4267" /> <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_361_4267" result="shape" /> </filter> </defs> </svg>
                    {
                        episode.info.movie_image ?
                            <img src={episode.info.movie_image} /> :
                            <img alt="placeholder" src={placeholder} />
                    }
                </div>
                <div class="info">
                    <span class="h4">{episode.episode_num}. {episode.title}</span>
                    <span class="rate">{ratingCount !== 0 && rating()}</span>
                    <span class="dur">{episode.info.duration_secs && secondsToHms(episode.info.duration_secs)}</span>
                </div>
            </div>
            <p class="text">{episode.info.plot}</p>
        </div>
    }

    const handleSeason = (e) => {
        const { value } = e.target;
        setSelectedSeason(Number(value) + 1);
    }

    const handlePlay = (episode, wathchedEpsd) => {
        const { username, password, serverInfo } = user;
        const server = AES.decrypt(user.server, "thisisserveraddress").toString(enc.Utf8);
        const decryptedPassword = AES.decrypt(password, "thisispassword").toString(enc.Utf8);
        const watchedEpsd = (wathchedEpsd ? wathchedEpsd : watchedEpisodes).episodes[user.loginType === "one-stream-panel" ? String(episode.id) : Number(episode.id)]
        if (watchedEpsd) {
            const { timeline, duration } = watchedEpsd;
            setTimeline(timeline)
        } else {
            setTimeline(0)
        }

        setStreamUrl(
            user.loginType === "one-stream-panel" ?
                Object.values(episode.links)[0] :
                `${server}/series/${username}/${decryptedPassword}/${episode.id}.${episode.container_extension}`
        )
        setPlayerOpen(true);
        setCurrentPlaying(episode);
        setCurrentEpisode(episode);

    }

    const onNextEpisode = () => {
        const { username, password, serverPrefix } = user;
        const { episodes } = series;
        const server = AES.decrypt(serverPrefix, "thisisserveraddress").toString(enc.Utf8);
        const decryptedPassword = AES.decrypt(password, "thisispassword").toString(enc.Utf8);
        const isLastEpisode = episodes[selectedSeason][episodes[selectedSeason].length - 1].id === currentPlaying.id;
        const isLastSeason = Object.keys(episodes).length === selectedSeason;
        const isLast = (isLastEpisode && isLastSeason);

        if (!isLast) {
            setLoading(true);
            const episode = episodes[isLastEpisode ? selectedSeason + 1 : selectedSeason][isLastEpisode ? 0 : currentEpisode.episode_num];
            const isWatched = watchedEpisodes.keys.filter(key => String(key) === String(episode.id))[0]
            if (isWatched) {
                setTimeline(watchedEpisodes.episodes[isWatched].timeline)
            } else {
                setTimeline(0)
            } setPlayerOpen(false);
            setCurrentEpisode(episode);
            setCurrentPlaying(episode)
            setSelectedSeason(isLastEpisode ? selectedSeason + 1 : selectedSeason);
            setStreamUrl(
                user.loginType === "one-stream-panel" ?
                    Object.values(episode.links)[0] :
                    `${server}/series/${username}/${decryptedPassword}/${episode.id}.${episode.container_extension}`
            )
            setTimeout(() => {
                setLoading(false)
                setPlayerOpen(true)
            }, 1000);
            getEpisodeTimeline(null, null, true);
        } else {
            setPlayerOpen(false);
        }
    }

    const playEpisode = (season, episodeToPlay) => {
        setLoading(true);

        const episodeNum = episodeToPlay.episode_num;
        const { episodeId } = episodeToPlay
        const watchedEpsd = watchedEpisodes.episodes[user.loginType === "one-stream-panel" ? String(episodeId) : Number(episodeId)]
        if (watchedEpsd) {
            const { timeline, duration } = watchedEpsd;
            setTimeline(timeline)

        } else {
            setTimeline(0)
        }
        setPlayerOpen(false);
        const { username, password, serverPrefix } = user;
        const { episodes } = series;
        const episode = episodes[season][episodeNum - 1];
        const server = AES.decrypt(serverPrefix, "thisisserveraddress").toString(enc.Utf8);
        const decryptedPassword = AES.decrypt(password, "thisispassword").toString(enc.Utf8);   
        setCurrentEpisode(episode);
        setStreamUrl(
            user.loginType === "one-stream-panel" ?
                Object.values(episode.links)[0] :
                `${server}/series/${username}/${decryptedPassword}/${episode.id}.${episode.container_extension}`
        )
        setTimeout(() => {
            setLoading(false)
            setPlayerOpen(true)
        }, 1000);
        getEpisodeTimeline(null, null, true);

    }

    const handleTrailer = () => {
        setShowTrailer(true);
        reactPlayerRef.current.seekTo(0, "seconds")
    };

    const handleClose = () => {
        if (state === "play") {
            router(`/dashboard?view=series`)
        } else {
            setTimeout(() => {
                getEpisodeTimeline();
            }, 1000);
            setPlayerOpen(false)
        }
    };

    const handleCloseTrailer = () => {
        reactPlayerRef.current.seekTo(0)
        setShowTrailer(false)
    }

    return (
        loading ?
            <Loading />
            :
            <div>
                <DashboardHeader
                    currentAction={"series"}
                />
                <section class="mainBanner previewMainBanner">
                    <div class="item">
                        <div class="thumb">
                            <span class="effectGrad"></span><img src={(series.info.backdrop_path && series.info.backdrop_path.length > 0) ? series.info.backdrop_path[0] : series.info.cover} />
                        </div>
                        <div class="info">
                            <span class="h2">{series?.info.name}</span>
                            <div class="playInfo">
                                {
                                    Number(series?.info?.rating) > 0 &&
                                <span class="rating"><svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0.163086 8.51797C0.276456 8.14688 0.474801 7.84313 0.854064 7.70179C1.18901 7.57702 1.54762 7.59745 1.89613 7.56325C2.86719 7.46795 3.83913 7.38341 4.81084 7.29542C5.45879 7.23669 6.10632 7.17366 6.75492 7.12526C6.94982 7.11063 7.06577 7.05986 7.15074 6.85764C7.86883 5.14762 8.60369 3.44448 9.3306 1.73833C9.64984 0.988843 10.4527 0.745322 11.0518 1.22139C11.2286 1.36187 11.3328 1.55139 11.4201 1.75554C12.156 3.47976 12.8958 5.20226 13.6286 6.92777C13.6793 7.0476 13.7389 7.1031 13.8691 7.11407C14.9671 7.207 16.0648 7.30338 17.1622 7.40298C17.9818 7.47742 18.8014 7.55228 19.62 7.6379C20.0739 7.68523 20.3798 7.94617 20.5222 8.37233C20.6685 8.81011 20.5586 9.20723 20.2178 9.51335C19.4619 10.1925 18.6934 10.8579 17.9295 11.5282C17.2454 12.1284 16.5624 12.7295 15.8742 13.3247C15.7807 13.4056 15.7622 13.4749 15.7897 13.5953C16.2128 15.442 16.6285 17.2905 17.0492 19.1378C17.1583 19.6167 17.0505 20.0228 16.6566 20.327C16.2853 20.6138 15.8291 20.6165 15.3898 20.3539C13.7673 19.3839 12.1444 18.4148 10.5247 17.4402C10.4114 17.372 10.3348 17.3729 10.2214 17.4411C8.59552 18.418 6.96789 19.3925 5.3366 20.3603C4.59421 20.8009 3.7563 20.3937 3.65304 19.5541C3.63734 19.4261 3.65541 19.3006 3.68295 19.1784C4.09663 17.3501 4.50988 15.5213 4.93411 13.6954C4.98079 13.4947 4.94056 13.3804 4.78416 13.2447C3.36886 12.0176 1.9641 10.7785 0.552891 9.54669C0.355192 9.37395 0.25688 9.14871 0.163516 8.91617C0.163086 8.78386 0.163086 8.65092 0.163086 8.51797Z" fill="#FEC007" /> </svg>{Number(series?.info?.rating).toFixed(1)}</span>
                            }
                                
                                <span class="duration">{Object.keys(series?.episodes).length} Seasons</span>
                                {
                                    series?.info[currentKeys.releaseDate] ?
                                        <span class="date">{series?.info[currentKeys.releaseDate]}</span> :
                                        null
                                }
                                <strong>HD</strong>
                            </div>
                            <p class="text"> { series?.info?.cast && series?.info?.cast.length > 0 && <><b>Genre:</b> {series?.info?.cast?.split(",").map(cast => cast + " / ")}</> }  <br/> { series.info.director && series.info.director.length > 0 && <><b>Directed By:</b> {series.info.director}</> }  </p>
                            <p class="text">{series?.info.plot}</p>
                            <div class="btnGroup">
                                <button style={{
                                    position: "relative"
                                }} onClick={() => getEpisodeTimeline("play", null, null)} class="btn btn-primary playBtn"><svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0 0.120605V29.8574L27.928 14.989L0 0.120605Z" fill="white" /> </svg>
                                    {watchedEpisode ? watchedEpisode.watched > 0 ? "Resume" : "Play" : "Play"}
                                    {
                                        watchedEpisode && watchedEpisode.watched > 0 > 0 &&
                                        <Watched progress={watchedEpisode.watched} />
                                    }
                                </button>
                                {
                                    addingToFav ?
                                        <div className='fav-loader-container'>
                                            <CircularProgress className='fav-loader' />
                                        </div> :
                                        <button onClick={handleFavourites} class="btn btn-primary"><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill={addedToFav ? "#FF0000" : "white"} /> </svg> My Fav</button>
                                }
                                {
                                    ytPlayerReady &&
                                    <button onClick={handleTrailer} className="btn btn-primary">
                                        Watch Trailer
                                    </button>
                                }
                                <div className='drop-down-container'>
                                <select onChange={handleSeason}>
                                    {Object.keys(series?.episodes).map((season, index) => <option key={index} value={index} selected={index + 1 === selectedSeason}>Season {season}</option>)}
                                </select>
                                {
                                Object.keys(series?.episodes).length > 1 && 
                                <ArrowDropDownIcon className='down-arrow'/>

                                }
                                </div>
                                
                                {/* <button class="btn btn-primary"><svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M11.0936 13.855C11.0936 13.7095 11.0936 13.6183 11.0936 13.5274C11.0936 9.8376 11.0926 6.1476 11.0943 2.45784C11.0948 1.50936 11.7771 0.795837 12.6786 0.790797C13.5445 0.785997 14.2623 1.46928 14.2822 2.33544C14.2959 2.92512 14.2861 3.51552 14.2863 4.10544C14.2866 7.2468 14.2863 10.3882 14.2863 13.5295C14.2863 13.6207 14.2863 13.7117 14.2863 13.8391C14.3595 13.7892 14.4128 13.7592 14.4586 13.7206C15.6176 12.7488 16.7773 11.778 17.9331 10.8026C18.3517 10.4494 18.819 10.2814 19.3635 10.4057C20.0142 10.5542 20.4342 10.9711 20.6084 11.6016C20.7834 12.2352 20.5983 12.7958 20.0962 13.2168C17.9761 14.995 15.8504 16.7666 13.7192 18.5316C13.1178 19.0296 12.2547 19.0243 11.6485 18.522C9.51151 16.751 7.37887 14.9746 5.25223 13.1911C4.54879 12.6012 4.46959 11.6263 5.03959 10.9409C5.59831 10.2686 6.63751 10.1489 7.32631 10.7136C8.51527 11.688 9.68551 12.6852 10.8639 13.6723C10.9258 13.7242 10.9902 13.7726 11.0936 13.855Z" fill="white" /> <path d="M12.715 19.9429C15.1841 19.9429 17.653 19.9381 20.1221 19.945C21.271 19.9484 22.0318 21.0606 21.6238 22.117C21.3833 22.7394 20.8071 23.1315 20.1084 23.1337C18.8199 23.1375 17.5313 23.1349 16.2428 23.1349C12.6015 23.1349 8.96019 23.1356 5.31915 23.1344C4.53675 23.1342 3.91947 22.6947 3.71187 21.999C3.40347 20.9655 4.16115 19.9494 5.25795 19.9448C7.06179 19.9376 8.86587 19.9426 10.67 19.9426C11.3516 19.9429 12.0334 19.9429 12.715 19.9429Z" fill="white" /> </svg> Download</button> */}
                            </div>
                        </div>
                    </div>
                </section>

                <section class="seriesList">
                    <span class="h3">Season {selectedSeason} <b>Episodes</b></span>
                    {
                        series.episodes[selectedSeason]?.map((episode, index) => (
                            <Episode key={index} episode={episode} />
                        ))
                    }

                </section>

                {
                    loading &&
                    <Loading />
                }
                <div>
                    {
                        showTrailer &&
                        <CloseOutlined onClick={handleCloseTrailer} className='close-icon' />
                    }

                    <ReactPlayer
                        onError={() => setShowTrailer(false)}
                        url={`https://www.youtube.com/watch?v=${series.info.youtube_trailer}`}
                        width={"100%"}
                        height={"100%"}
                        onReady={() => setYtPlayerReady(true)}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            zIndex: 9999,
                            visibility: showTrailer ? "visible" : "hidden",
                            opacity: showTrailer ? 1 : 0,
                            transition: ".4s"
                        }}
                        playing={showTrailer}
                        config={{
                            youtube: {
                                playerVars: {
                                    fullscreen: true,
                                }
                            }
                        }}
                        ref={reactPlayerRef}
                    />
                </div>
                {playerOpen ?
                    currentPlayer.player === 'videojs' ?
                        <VideoJsPlayer
                            close={handleClose}
                            src={streamUrl}
                            selectedSeason={selectedSeason}
                            series={series}
                            id={item}
                            watchedEpisodes={watchedEpisodes}
                            type="series"
                            timeline={timeline}
                            episodes={episodes}
                            onNext={onNextEpisode}
                            seasonChanged={e => setSelectedSeason(Number(e))}
                            currentPlaying={currentPlaying}
                            setCurrentPlaying={(epsd) => setCurrentPlaying(epsd)}
                            playEpisode={(data) => playEpisode(data.season, data)} /> :
                        <Player
                            close={handleClose}
                            src={streamUrl}
                            selectedSeason={selectedSeason}
                            series={series}
                            id={item}
                            watchedEpisodes={watchedEpisodes}
                            type="series"
                            timeline={timeline}
                            episodes={episodes}
                            onNext={onNextEpisode}
                            seasonChanged={e => setSelectedSeason(Number(e))}
                            currentPlaying={currentPlaying}
                            setCurrentPlaying={(epsd) => setCurrentPlaying(epsd)}
                            playEpisode={(data) => playEpisode(data.season, data)} /> :
                    null
                }
                <ParentalLock
                    action={"verify"}
                    close={() => setAdult(false)}
                    open={adult}
                    noEscape={true}
                    completed={() => setAdult(false)}
                />
            </div>

    )
}

export default SeriesPreview
