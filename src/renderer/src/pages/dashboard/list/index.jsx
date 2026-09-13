import Carousel, { CarouselItem } from '../../../helpers/carousel/dashboard';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react'
// import { Grid } from 'react-virtualized';
import { useContext } from "react"
import { AppContext } from '../../../contexts/app';
import useApi from '../../../hooks/useApi';
import { addToFavs, getFavourites, getRecents, removeFromFavs, removeMovieFromRecents } from '../../../firebase/functions';
import Scrollable from '../../../helpers/scrollable';
import { getDatabase, onValue, ref } from 'firebase/database';
import { app } from '../../../firebase';
import "./styles.css"
import ParentalLock from '../../../helpers/parentalLock';
import Watched from '../../../helpers/progress';
import placeholderImage from "../../../assets/placeholder.png"
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Cancel, Info } from '@mui/icons-material';
import { Box, Dialog, Modal } from '@mui/material';
import M3uList from './m3u';
import { Link, useNavigate } from 'react-router-dom';
import { Grid } from 'react-virtualized';

const options = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
};
export const formattedDate = (givenDate) => {
    const isNumber = /^[0-9]+$/.test(givenDate);
    const timestamp = new Date(isNumber ? Number(givenDate) : givenDate).getTime();
    return new Intl.DateTimeFormat('en-US', options).format(timestamp);
}

const AllList = ({ currentUser, currentAction }) => {
    const router = useNavigate();
    const { makeRequest } = useApi()
    const { user, streamData, alert, parentalVerified } = useContext(AppContext);
    const { movies, series } = streamData;
    const currentSelected = currentAction === "series" ? series : movies;
    const currentKeys = {
        id: currentAction === "series" ? "series_id" : "stream_id",
        image: currentAction === "series" ? "cover" : "stream_icon"
    }
    const refs = useRef([]);
    const listImagesRef = useRef([]);
    const bannerImagesCounter = useRef(0);
    let mouseDown = false;
    let startX, scrollLeft;
    const database = getDatabase(app);
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    })
    const [bannerMovies, setBannerMovies] = useState([]);
    const [show, setShow] = useState(false);
    const [FavouriteMovies, setFavouriteMovies] = useState(null);
    const [recents, setRecents] = useState([]);
    const [finalAddress, setFinalAddress] = useState(null);
    const [bannerImagesLoaded, setBannerImagesLoaded] = useState(false);
    const [showParentalLock, setShowParentalLock] = useState(false);
    const [clickedAdultItem, setClickedAdultItem] = useState(null);
    const [continueWatchingClicked, setContinueWatchingClicked] = useState(false);
    const [currentRecentItem, setCurrentRecentItem] = useState(null);

    const path = currentAction === "movies" ? "Movie" : "Series";
    const adultArray = ["adult", "xxx", "porn", "sex", "adults", "ADULTS", "+18", "18+", "18"];


    useEffect(() => {
        setBannerMovies([])
        if (currentSelected.banner.streams) {
            setBannerMovies(currentSelected.banner.streams)
        }

    }, [currentSelected.banner.streams, currentAction]);

    const handleResize = () => {
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
        });
    }

    useEffect(() => {
       window.addEventListener("resize", handleResize)
       return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (user) {
            setFinalAddress(user.dbAddress)
        }
    }, [user])

    useEffect(() => {

        setShow(false);
        setTimeout(() => {
            setShow(true);
        }, 500);
        setFavouriteMovies(null);
        setRecents([])

    }, [currentAction]);

    useEffect(() => {
        if (finalAddress && currentSelected.streams) {
            getFavs();
            onValue(ref(database, `${finalAddress}/Fav/${currentAction === "movies" ? 'Movie' : 'Series'}`), (snapshot) => {
                getFavs(snapshot.val())
            });
            onValue(ref(database, `${finalAddress}/Recent/${currentAction === "movies" ? 'Movie' : 'Series'}`), (snapshot) => {
                getRecent()

            });
            getRecent()
        }
    }, [currentAction, finalAddress, currentSelected]);

    const getFavs = async (values) => {
        try {
            const response = await getFavourites(path, finalAddress);
            const ids = response.val() ? Object.keys(response.val()) : [];
            const values = response.val() ? Object.values(response.val()) : [];
            const merge = () => {
                const mergedArr = []

                ids.forEach((id, index) => {
                    mergedArr.push({
                        id,
                        timestamp: values[index]
                    })
                }
                );
                return mergedArr;
            }
            const sortedValues = merge()
            if (ids) {
                let favs = []
                sortedValues.map(vl => {
                    const itemExists = currentSelected.streams.filter(movie => String(movie[currentKeys.id]) === String(vl.id));
                    if (itemExists.length > 0) {
                        favs.push({
                            timestamp: vl.timestamp,
                            ...itemExists[0]
                        });
                    }
                });
                const sorted = favs.sort(
                    (objA, objB) => objB.timestamp - objA.timestamp
                );

                setFavouriteMovies(sorted)
            } else {
                setFavouriteMovies(null)
            }

        } catch (error) {
            console.log(error)
        }
    }

    const handleFavourites = async (id, liked) => {
        try {
            if (liked) {
                await removeFromFavs(id, path, finalAddress);
                alert.toggle({
                    title: "Removed from Favourites",
                    show: true,
                    type: "success"
                })
            } else {
                await addToFavs(id, path, finalAddress);
                alert.toggle({
                    title: "Added to Favourites",
                    show: true,
                    type: "success"
                })
            }

        } catch (error) {
            console.log(error);
            alert.toggle({
                title: "Something went wrong",
                show: true,
                type: "error"
            })
        };
        getFavs();
    }


    const getRecent = async () => {
        try {
            const response = await getRecents(path, finalAddress);
            if (response.val()) {
                const ids = Object.keys(response.val());
                const values = Object.values(response.val());
                const data = Object.values(response.val());
                const recentsArr = [];
                ids.map((id, index) => {
                    const updated = recentsArr.filter(item => item.id !== id);
                    const info = currentSelected.streams.filter(movie => String(movie[currentKeys.id]) === String(id))[0];

                    // // setRecents(prev => {
                    // const updated = recentsArr.filter(item => item.id !== id);
                    // const info = currentSelected.streams.filter(movie => String(movie[currentKeys.id]) === String(id))[0];
                    // return [...updated, {
                    //     id,
                    //     ...data[index],
                    //     info
                    // }]
                    // })
                    const isShow = data[index].showInContinueWatchingList;
                    if (isShow) {
                        if (isShow === 'true') {
                            recentsArr.push(
                                {
                                    id,
                                    ...data[index],
                                    info
                                })
                        }
                    } else {
                        recentsArr.push(
                            {
                                id,
                                ...data[index],
                                info
                            })
                    }

                })
                const sorted = recentsArr.sort(
                    (objA, objB) => objB.timestamp - objA.timestamp
                );
                setRecents(sorted)
            } else {
                setRecents([])
            }

        } catch (error) {
            console.log(error)
        }
    }

    const stopDragging = function (e, ref) {
        mouseDown = false;
        const nodes = ref.childNodes[0].childNodes[0].childNodes;
        nodes.forEach(el => {
            el.style.pointerEvents = "auto"
        })
    };


    const handleListDown = (e, ref) => {
        mouseDown = true;
        startX = e.pageX - ref.childNodes[0].offsetLeft;
        scrollLeft = ref.childNodes[0].scrollLeft;
    }

    const handlelistMove = (e, ref) => {
        e.preventDefault();

        if (mouseDown) {
            const nodes = ref.childNodes[0].childNodes[0].childNodes;
            nodes.forEach(el => {
                el.style.pointerEvents = "none"
            });
            const x = e.pageX - ref.childNodes[0].offsetLeft;
            const scroll = x - startX;
            ref.childNodes[0].scrollLeft = scrollLeft - scroll;
        }
    }

    const getParentalPin = (key) => {
        if (!key || typeof window === 'undefined') {
            return ""
        }
        const user = localStorage.getItem(key)
        const retrievedUser = user && Object.values(JSON.parse(user))[0].parentalPin;
        return retrievedUser;
    }


    const parentalPin = getParentalPin("currentUser");

    const Category = ({ index }) => {

        const filtered = currentSelected?.streams.filter(movie =>
            (movie?.category_id === currentSelected.streamCategories[index].category_id) ||
            (movie?.categories?.filter(id => String(id) === String(currentSelected.streamCategories[index].category_id)).length > 0))
        const [errorIndex, setErrorIndex] = useState(null);

        const innerElement = (args) => {

            const filteredComp = filtered[args.columnIndex];
            const { category_name, added, name } = filteredComp;
            const isFavourite = FavouriteMovies && FavouriteMovies.filter(movie => movie[currentKeys.id] === filteredComp[currentKeys.id]).length > 0;
            const category = currentSelected.streamCategories[index].category_name;
            const isAdult = adultArray.filter(item => category.toLowerCase().includes(item.toLowerCase())).length > 0;
            const handleItem = () => {
                if (parentalPin) {
                    if (isAdult) {
                        setClickedAdultItem(filteredComp[currentAction === "movies" ? "stream_id" : "series_id"])
                        setShowParentalLock(true);
                    } else {
                        setShowParentalLock(false);
                        router(
                            `/dashboard/preview/${currentAction}/${filteredComp[currentAction === "movies" ? "stream_id" : "series_id"]}`,
                        )
                    }
                } else {
                    router(
                        `/dashboard/preview/${currentAction}/${filteredComp[currentAction === "movies" ? "stream_id" : "series_id"]}`,
                    )
                }
            }
            return (
                <div style={{ ...args.style, padding: 5, paddingTop: 6 }}>

                    <div onClick={handleItem} key={args.key} className="item">
                        <div className="caption">
                            <span className="control">
                                {
                                    (Number(filteredComp.rating).toFixed(1) !== 'NaN' && Number(filteredComp.rating) !== 0) ?
                                        <span className="count">{Number(filteredComp.rating).toFixed(1)}</span> : <span></span>
                                }
                                {
                                    isFavourite &&
                                    <Link to='javascript:void(0)'><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill="#FF0000" /> </svg></Link>
                                }
                            </span>
                            <span className="info">
                                <text>{category_name}</text>
                                {/* <text>{added && formattedDate(added)}</text> */}
                            </span>
                            <span className="h2">{name}</span>
                        </div>
                        <div className="thumb">
                            {
                                errorIndex === args.columnIndex ?
                                    <img alt="placeholder" src={placeholderImage} /> :
                                    filteredComp[currentKeys.image] ?
                                        <img
                                            style={{
                                                filter: (isAdult && parentalPin) && 'blur(20px)'
                                            }}
                                            onError={() => setErrorIndex(args.columnIndex)}
                                            src={
                                                filteredComp[currentKeys.image]
                                            } ref={(element) => listImagesRef.current[index] = element} />
                                        :
                                        <img alt="placeholder" src={placeholderImage} ref={(element) => listImagesRef.current[index] = element} />
                            }
                            {(isAdult && parentalPin) &&
                                <svg style={{ zIndex: 99, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} width="32" height="38" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.35342 0.978516C9.71046 0.978516 10.0675 0.978516 10.4246 0.978516C10.6069 1.0108 10.7891 1.04529 10.972 1.07454C13.6371 1.50415 15.8459 3.8255 16.0656 6.51604C16.1583 7.65313 16.1075 8.80208 16.1216 9.94578C16.1229 10.0653 16.1218 10.1847 16.1218 10.3277C16.3536 10.3277 16.5625 10.3274 16.7714 10.3277C18.2385 10.3296 19.2373 11.3213 19.2379 12.7826C19.2392 16.337 19.239 19.8918 19.2379 23.4462C19.2373 24.9108 18.2409 25.908 16.7791 25.9094C15.3184 25.9108 13.8576 25.9097 12.3969 25.9097C9.24001 25.9097 6.08316 25.9124 2.92631 25.9083C1.60326 25.9066 0.549224 24.9067 0.545085 23.6167C0.533772 19.9486 0.535152 16.2805 0.545085 12.6123C0.54812 11.4981 1.37617 10.547 2.47545 10.3743C2.8554 10.3147 3.24694 10.3277 3.65641 10.3061C3.65641 10.2176 3.65641 10.1301 3.65641 10.0429C3.65696 9.06089 3.64813 8.07888 3.65972 7.09714C3.69007 4.49186 5.41763 2.12443 7.89129 1.3179C8.36506 1.16338 8.86531 1.08944 9.35342 0.978516ZM14.04 10.321C14.04 9.49768 14.0469 8.69612 14.0372 7.89484C14.0314 7.42549 14.0414 6.95007 13.9718 6.48817C13.6457 4.31968 11.4524 2.74195 9.29354 3.10037C7.17969 3.45107 5.74929 5.12373 5.73853 7.26407C5.73384 8.20498 5.73743 9.14615 5.73798 10.0871C5.73798 10.1638 5.7446 10.2405 5.74819 10.321C8.51957 10.321 11.2598 10.321 14.04 10.321ZM9.88457 14.4809C8.99416 14.4842 8.19481 15.0664 7.91475 15.9154C7.63634 16.7589 7.92192 17.6764 8.65147 18.2081C8.81095 18.3242 8.86062 18.4412 8.85786 18.628C8.8482 19.293 8.85206 19.958 8.85593 20.623C8.85675 20.7515 8.86282 20.8848 8.89732 21.0073C9.03279 21.4883 9.51318 21.8086 9.9897 21.749C10.5222 21.6822 10.9071 21.2879 10.9174 20.7609C10.9312 20.0557 10.9295 19.3498 10.9187 18.6443C10.9157 18.4478 10.967 18.3253 11.1326 18.2036C11.8607 17.6681 12.1408 16.7523 11.8583 15.908C11.5735 15.0553 10.7742 14.4776 9.88457 14.4809Z" fill="black" />
                                </svg>}
                        </div>
                    </div>
                </div>
            )
        }

        const handleTouchMove = (e, ref) => {
            e.preventDefault();

            const x = e.touches[0].clientX - ref.childNodes[0].offsetLeft;
            const scroll = x - startX;
            ref.childNodes[0].scrollLeft = scrollLeft - scroll;
            if (mouseDown) {
                const nodes = ref.childNodes[0].childNodes[0].childNodes;
                nodes.forEach(el => {
                    el.style.pointerEvents = "none"
                });
                const x = e.touches[0].clientX - ref.childNodes[0].offsetLeft;
                const scroll = x - startX;
                ref.childNodes[0].scrollLeft = scrollLeft - scroll;
            }
        }

        const handleTouchStart = (e, ref) => {
            mouseDown = true;
            startX = e.touches[0].clientX - ref.childNodes[0].offsetLeft;
            scrollLeft = ref.childNodes[0].scrollLeft;
        }

        return filtered.length > 0 && <section key={index} className="category listSlider">
            <span className="h3">{currentSelected.streamCategories[index].category_name}</span>
            <div className="list"
            >
                <div style={{
                    paddingLeft: 10
                }} className="owl-carousel owl-theme"
                    onMouseDown={e => handleListDown(e, refs.current[Number(index)])}
                    onMouseUp={e => stopDragging(e, refs.current[Number(index)])}
                    onMouseLeave={e => stopDragging(e, refs.current[Number(index)])}
                    onTouchEnd={e => stopDragging(e, refs.current[Number(index)])}
                    onTouchStart={e => handleTouchStart(e, refs.current[Number(index)])}
                    onTouchMove={e => handleTouchMove(e, refs.current[Number(index)])}
                    onMouseMove={e => handlelistMove(e, refs.current[Number(index)])}
                    ref={element => refs.current[index] = element}>
                    {
                        currentSelected.streams ?
                            <Grid
                                height={270}
                                cellRenderer={innerElement}
                                columnCount={filtered ? filtered.length : 0}
                                rowHeight={250}
                                style={{
                                    overflowY: "hidden",
                                    overflowX: "hidden",
                                    paddingTop: 15,
                                    paddingLeft: 5,
                                }}
                                rowCount={1}
                                columnWidth={173}
                                width={window.innerWidth - (window.innerWidth / 20)}

                            />
                            :
                            <>
                                <Skeleton sx={{ borderRadius: 2 }} variant='rectangle' height={300} width={300} />
                                <Skeleton sx={{ borderRadius: 2 }} variant='rectangle' height={300} width={300} />
                                <Skeleton sx={{ borderRadius: 2 }} variant='rectangle' height={300} width={300} />
                                <Skeleton sx={{ borderRadius: 2 }} variant='rectangle' height={300} width={300} />
                                <Skeleton sx={{ borderRadius: 2 }} variant='rectangle' height={300} width={300} />
                            </>
                    }
                </div>


            </div>
        </section>
    }
    const FavsCategory = ({ favMovies }) => {
        return favMovies.length > 0 &&
            <section
                className="category">
                <span style={{ marginTop: 20 }} className="h3">Favourites</span>
                <Scrollable>
                    {favMovies?.map((movie, index) => {
                        const added = currentAction === "movies" ? movie.added : movie.last_modified;
                        const isCategory = currentSelected.streamCategories?.filter(ctg =>
                            String(ctg.category_id) === String(movie?.category_id) ||
                            String(ctg.category_id) === String(movie?.categories && movie?.categories[0])
                        )[0];
                        const category = isCategory && isCategory.category_name;

                        const isAdult = adultArray.filter(item => category?.toLowerCase().includes(item.toLowerCase())).length > 0;
                        const handleItem = () => {
                            if (parentalPin) {
                                if (isAdult) {
                                    setClickedAdultItem(movie[currentAction === "movies" ? "stream_id" : "series_id"])
                                    setShowParentalLock(true);
                                } else {
                                    setShowParentalLock(false);
                                    router(`/dashboard/preview/${currentAction}/${movie[currentAction === "movies" ? "stream_id" : "series_id"]}`,
                                    )
                                }
                            } else {
                                router(`/dashboard/preview/${currentAction}/${movie[currentAction === "movies" ? "stream_id" : "series_id"]}`,
                                )
                            }
                        }
                        return <div onClick={handleItem}>
                            <div key={index} style={{ marginTop: 10, marginBottom: 10, width: 165, borderRadius: 5 }} className="item">
                                <div className="caption">
                                    <span className="control">
                                        {(Number(movie.rating).toFixed(1) !== 'NaN' && Number(movie.rating) !== 0) ?
                                            <span className="count">{Number(movie.rating).toFixed(1)}</span> : <span></span>}
                                        <Link to='javascript:void(0)'><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill="#FF0000" /> </svg></Link>
                                    </span>
                                    <span className="info">
                                        <text>{""}</text>
                                        {/* <text>{added && formattedDate(added)}</text> */}
                                    </span>
                                    <span className="h2">{movie.name}</span>
                                </div>
                                <div className="thumb">
                                    {
                                        movie[currentKeys.image] ?
                                            <img
                                                style={{
                                                    filter: (isAdult && parentalPin) && 'blur(20px)'
                                                }}
                                                src={
                                                    movie[currentKeys.image]
                                                } /> :
                                            <img alt="placeholder" layout='fill' src={placeholderImage} />
                                    }
                                    {(isAdult && parentalPin) &&
                                        <svg style={{ zIndex: 99, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} width="32" height="38" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.35342 0.978516C9.71046 0.978516 10.0675 0.978516 10.4246 0.978516C10.6069 1.0108 10.7891 1.04529 10.972 1.07454C13.6371 1.50415 15.8459 3.8255 16.0656 6.51604C16.1583 7.65313 16.1075 8.80208 16.1216 9.94578C16.1229 10.0653 16.1218 10.1847 16.1218 10.3277C16.3536 10.3277 16.5625 10.3274 16.7714 10.3277C18.2385 10.3296 19.2373 11.3213 19.2379 12.7826C19.2392 16.337 19.239 19.8918 19.2379 23.4462C19.2373 24.9108 18.2409 25.908 16.7791 25.9094C15.3184 25.9108 13.8576 25.9097 12.3969 25.9097C9.24001 25.9097 6.08316 25.9124 2.92631 25.9083C1.60326 25.9066 0.549224 24.9067 0.545085 23.6167C0.533772 19.9486 0.535152 16.2805 0.545085 12.6123C0.54812 11.4981 1.37617 10.547 2.47545 10.3743C2.8554 10.3147 3.24694 10.3277 3.65641 10.3061C3.65641 10.2176 3.65641 10.1301 3.65641 10.0429C3.65696 9.06089 3.64813 8.07888 3.65972 7.09714C3.69007 4.49186 5.41763 2.12443 7.89129 1.3179C8.36506 1.16338 8.86531 1.08944 9.35342 0.978516ZM14.04 10.321C14.04 9.49768 14.0469 8.69612 14.0372 7.89484C14.0314 7.42549 14.0414 6.95007 13.9718 6.48817C13.6457 4.31968 11.4524 2.74195 9.29354 3.10037C7.17969 3.45107 5.74929 5.12373 5.73853 7.26407C5.73384 8.20498 5.73743 9.14615 5.73798 10.0871C5.73798 10.1638 5.7446 10.2405 5.74819 10.321C8.51957 10.321 11.2598 10.321 14.04 10.321ZM9.88457 14.4809C8.99416 14.4842 8.19481 15.0664 7.91475 15.9154C7.63634 16.7589 7.92192 17.6764 8.65147 18.2081C8.81095 18.3242 8.86062 18.4412 8.85786 18.628C8.8482 19.293 8.85206 19.958 8.85593 20.623C8.85675 20.7515 8.86282 20.8848 8.89732 21.0073C9.03279 21.4883 9.51318 21.8086 9.9897 21.749C10.5222 21.6822 10.9071 21.2879 10.9174 20.7609C10.9312 20.0557 10.9295 19.3498 10.9187 18.6443C10.9157 18.4478 10.967 18.3253 11.1326 18.2036C11.8607 17.6681 12.1408 16.7523 11.8583 15.908C11.5735 15.0553 10.7742 14.4776 9.88457 14.4809Z" fill="black" />
                                        </svg>}
                                </div>
                            </div>
                        </div>
                    })}
                </Scrollable>
            </section>
    };

    const removeItemFromRecents = async () => {
        try {
            await removeMovieFromRecents(currentRecentItem.id, currentAction === 'movies' ? 'Movie' : 'Series', finalAddress);
        } catch (error) {
            console.log('ERROR', error)
        }
        setCurrentRecentItem(null)
    }

    const Recents = () => {

        return recents.length > 0 && <section className="category">
            <span className="h3">Continue Watching</span>
            <Scrollable>
                {recents.map((movie, index) => {
                    const values = Object.values(movie)
                    const lastWatched = false
                    // values && values.filter(vl => vl.lastWatched === 'true')
                    const watched = currentAction === 'series' ? lastWatched.length > 0 && (lastWatched[0].timeline / lastWatched[0].duration) * 100 : (movie.timeline / movie.duration) * 100;
                    const added = currentAction === "movies" ? movie.info?.added : movie.info?.last_modified
                    const isFavourite = FavouriteMovies ? FavouriteMovies.filter(item => String(item[currentKeys.id]) === String(movie.id)).length > 0 : null;
                    const isCategory =
                        currentSelected.streamCategories?.filter(ctg =>
                            String(ctg.category_id) === String(movie?.info?.category_id) ||
                            String(ctg.category_id) === String(movie?.info?.categories && movie.info?.categories[0])
                        )[0];
                    const category = isCategory && isCategory.category_name;
                    const isAdult = adultArray.filter(item => category?.toLowerCase().includes(item.toLowerCase())).length > 0;

                    const handleItem = (action) => {
                        setContinueWatchingClicked(true);
                        if (parentalPin) {
                            if (isAdult) {
                                setClickedAdultItem(movie.info[currentAction === "movies" ? "stream_id" : "series_id"])
                                setShowParentalLock(true);
                            } else {
                                setShowParentalLock(false);
                                if (action === 'info') {

                                    router(
                                        `/dashboard/preview/${currentAction}/${movie.info[currentAction === "movies" ? "stream_id" : "series_id"]}`
                                    )
                                } else {
                                    router(`/dashboard/preview/${currentAction}/${movie.info[currentAction === "movies" ? "stream_id" : "series_id"]}?state=play`,
                                    )
                                }
                            }
                        } else {
                            if (action === 'info') {

                                router(`/dashboard/preview/${currentAction}/${movie.info[currentAction === "movies" ? "stream_id" : "series_id"]}`
                                )
                            } else {

                                router( `/dashboard/preview/${currentAction}/${movie.info[currentAction === "movies" ? "stream_id" : "series_id"]}?state=play`)
                            }

                        }
                    }

                    return <div key={index} style={{
                        position: 'relative'
                    }}>
                        <div onClick={handleItem} key={index} style={{ marginTop: 10, marginBottom: 10, width: 165, }} className="item">
                            <div className="caption">
                                <span className="control">
                                    {(Number(movie.info?.rating).toFixed(1) !== 'NaN' && Number(movie.info?.rating) !== 0) ? <span className="count">{Number(movie.info?.rating).toFixed(1)}</span> : <span></span>}
                                    {
                                        isFavourite &&
                                        <Link to='javascript:void(0)'><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill="#FF0000" /> </svg></Link>
                                    }
                                </span>
                                <span className="info">
                                    <text>{""}</text>
                                    {/* <text>{added && formattedDate(added)}</text> */}
                                </span>
                                <span className="h2">{movie.info?.name}</span>
                            </div>
                            <Watched progress={watched} />
                            <div className="thumb">
                                {
                                    movie.info && movie.info[currentKeys.image] ?
                                        <img style={{
                                            filter: (isAdult && parentalPin) && 'blur(20px)'
                                        }} src={
                                            movie.info[currentKeys.image]
                                        } /> :
                                        <img alt="placeholder" layout='fill' src={placeholderImage} />
                                }
                                {(isAdult && parentalPin) &&
                                    <svg style={{ zIndex: 99, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} width="32" height="38" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9.35342 0.978516C9.71046 0.978516 10.0675 0.978516 10.4246 0.978516C10.6069 1.0108 10.7891 1.04529 10.972 1.07454C13.6371 1.50415 15.8459 3.8255 16.0656 6.51604C16.1583 7.65313 16.1075 8.80208 16.1216 9.94578C16.1229 10.0653 16.1218 10.1847 16.1218 10.3277C16.3536 10.3277 16.5625 10.3274 16.7714 10.3277C18.2385 10.3296 19.2373 11.3213 19.2379 12.7826C19.2392 16.337 19.239 19.8918 19.2379 23.4462C19.2373 24.9108 18.2409 25.908 16.7791 25.9094C15.3184 25.9108 13.8576 25.9097 12.3969 25.9097C9.24001 25.9097 6.08316 25.9124 2.92631 25.9083C1.60326 25.9066 0.549224 24.9067 0.545085 23.6167C0.533772 19.9486 0.535152 16.2805 0.545085 12.6123C0.54812 11.4981 1.37617 10.547 2.47545 10.3743C2.8554 10.3147 3.24694 10.3277 3.65641 10.3061C3.65641 10.2176 3.65641 10.1301 3.65641 10.0429C3.65696 9.06089 3.64813 8.07888 3.65972 7.09714C3.69007 4.49186 5.41763 2.12443 7.89129 1.3179C8.36506 1.16338 8.86531 1.08944 9.35342 0.978516ZM14.04 10.321C14.04 9.49768 14.0469 8.69612 14.0372 7.89484C14.0314 7.42549 14.0414 6.95007 13.9718 6.48817C13.6457 4.31968 11.4524 2.74195 9.29354 3.10037C7.17969 3.45107 5.74929 5.12373 5.73853 7.26407C5.73384 8.20498 5.73743 9.14615 5.73798 10.0871C5.73798 10.1638 5.7446 10.2405 5.74819 10.321C8.51957 10.321 11.2598 10.321 14.04 10.321ZM9.88457 14.4809C8.99416 14.4842 8.19481 15.0664 7.91475 15.9154C7.63634 16.7589 7.92192 17.6764 8.65147 18.2081C8.81095 18.3242 8.86062 18.4412 8.85786 18.628C8.8482 19.293 8.85206 19.958 8.85593 20.623C8.85675 20.7515 8.86282 20.8848 8.89732 21.0073C9.03279 21.4883 9.51318 21.8086 9.9897 21.749C10.5222 21.6822 10.9071 21.2879 10.9174 20.7609C10.9312 20.0557 10.9295 19.3498 10.9187 18.6443C10.9157 18.4478 10.967 18.3253 11.1326 18.2036C11.8607 17.6681 12.1408 16.7523 11.8583 15.908C11.5735 15.0553 10.7742 14.4776 9.88457 14.4809Z" fill="black" />
                                    </svg>}
                            </div>

                        </div>



                        <Info
                            onClick={() => handleItem('info')}
                            sx={{
                                position: 'absolute',
                                bottom: -15,
                                left: 0,
                                fontSize: 22,
                                color: 'white',
                                ":hover": { cursor: 'pointer', transition: '.3s', opacity: .5 }
                            }}
                        />
                        <MoreVertIcon
                            onClick={() => {
                                setCurrentRecentItem(movie);
                            }}

                            sx={{
                                position: 'absolute',
                                bottom: -15,
                                right: 0,
                                fontSize: 22,
                                color: 'white',
                                ":hover": { cursor: 'pointer', transition: '.3s', opacity: .5 }
                            }}
                        />
                    </div>
                })}
            </Scrollable>
        </section>
    };



    return (

        <div className='list-container' style={{
            transition: ".4s",
            opacity: show ? 1 : 0,
        }}>
            {
                currentRecentItem &&
                <div style={{
                    opacity: currentRecentItem ? 1 : 0,
                }} className='continue-watching-container-modal'>
                    <div className='continue-watching-container'>
                        <p className='title'>{currentRecentItem?.info?.name}</p>
                        <Cancel onClick={() => setCurrentRecentItem(null)} sx={{ color: 'white', fontSize: 23, position: 'absolute', top: 10, right: 10, cursor: "pointer" }} />
                        <div className='cw-btns-container'>
                            <button onClick={async () => {
                                setCurrentRecentItem(null)
                                const isFavourite = FavouriteMovies.filter(item => String(item[currentKeys.id]) === String(currentRecentItem.id)).length > 0;
                                try {
                                    if (isFavourite) {
                                        await removeFromFavs(currentRecentItem.id, currentAction === 'movies' ? 'Movie' : 'Series', finalAddress);
                                        alert.toggle({
                                            show: true,
                                            title: "Removed from Favourites",
                                            type: "success"
                                        })
                                    } else {
                                        await addToFavs(currentRecentItem.id, currentAction === 'movies' ? 'Movie' : 'Series', finalAddress);
                                        alert.toggle({
                                            show: true,
                                            title: "Added to Favourites",
                                            type: "success"
                                        })
                                    }
                                } catch (error) {
                                    console.log('ERROR', error)
                                }
                            }}> {FavouriteMovies.filter(item => String(item[currentKeys.id]) === String(currentRecentItem.id)).length > 0 ? 'Remove from Favourites' : 'Add to Favourites'}</button>
                            <button onClick={removeItemFromRecents}>Remove from Row</button>
                        </div>
                    </div>
                </div>
            }
            {
                user?.loginType !== 'm3u' ?
                    <>
                        <ParentalLock
                            action={"verify"}
                            open={showParentalLock}
                            close={() => setShowParentalLock(false)}
                            completed={() => {
                                parentalVerified.toggle(true)
                                router(`/dashboard/preview/${currentAction}/${clickedAdultItem}`)
                            }}
                        />
                        {((currentSelected.streams && currentSelected.streams.length === 0) || !currentSelected.streams) ?
                            <div className="no-data-found-container">

                                {/* <Error color="warning" sx={{ fontSize: 30 }} /> */}
                                <img src="/noContentFound.svg" />
                                <h2 className="no-data-found">No {currentAction} found</h2>
                            </div> :
                            <>
                                {
                                    (bannerMovies && bannerMovies.length > 0) &&
                                    <section className="mainBanner">
                                        <div style={{ width: "100%" }} className="owl-carousel">
                                            <Carousel>                                      
                                                {
                                                    bannerMovies?.map((movie, index) => {
                                                        const targetVod = user.loginType === 'one-stream-panel' ? 'vod': 'movie_data'
                                                        const liked = FavouriteMovies?.filter(item => String(item[currentKeys.id]) === String(currentAction === "movies" ? movie[targetVod]?.stream_id : movie?.series_id)).length > 0;
                                                        const imgPath = () => {
                                                            if (currentAction === "movies") {
                                                                return (movie.info?.backdrop_path && movie.info?.backdrop_path.length > 0) ? movie.info?.backdrop_path[0] : movie.info?.cover ? movie.info?.cover : null
                                                            }
                                                            if (currentAction === "series") {
                                                                return (movie.backdrop_path && movie.backdrop_path.length > 0) ? movie.backdrop_path[0] : movie.cover ? movie.cover : null
                                                            }
                                                        }
                                                        const id = currentAction === "movies" ? movie?.[targetVod]?.stream_id : movie?.series_id
                                                        const aboutMovie = currentAction === "movies" ? movie?.info?.description ? movie?.info?.description : movie?.info?.plot : movie?.plot
                                                        return <CarouselItem key={index}>
                                                            <div className="item">
                                                                <div className="thumb"><span className="effectGrad"></span>
                                                                    {
                                                                        imgPath() ?
                                                                            <img src={imgPath()} /> :
                                                                            <img alt="placeholder" layout='fill' src={placeholderImage} />
                                                                    }
                                                                </div>
                                                                <div className="info">
                                                                    <span className="h2">{currentAction === 'movies' ? movie?.[targetVod]?.name : movie?.name}</span>
                                                                    <p className="text">{aboutMovie ? aboutMovie?.length > 400 ? aboutMovie.substring(0,400) + '...' : aboutMovie : null}</p>
                                                                    <div className="btnGroup">
                                                                        <Link to={`/dashboard/preview/${currentAction}/${currentAction === "movies" ? movie[targetVod]?.stream_id : currentSelected.streams[index].series_id}`} className="btn btn-primary playBtn"><svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0 0.120605V29.8574L27.928 14.989L0 0.120605Z" fill="white" /> </svg> Play</Link>
                                                                        <button onClick={() => handleFavourites(id, liked)
                                                                        } className="btn btn-primary"><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill={liked ? "#FF0000" : "white"} /> </svg> My Fav</button>
                                                                    </div>
                                                                </div>
                                                            </div></CarouselItem>
                                                    })
                                                }


                                            </Carousel>
                                        </div>
                                    </section>
                                }

                                <div style={{
                                    paddingTop: (bannerMovies && bannerMovies.length > 0) ? 0 : 70
                                }}>
                                    {
                                        FavouriteMovies &&
                                        FavouriteMovies &&
                                        <FavsCategory favMovies={FavouriteMovies} />

                                    }
                                    <Recents />
                                    {
                                        currentSelected.streamCategories?.map((ctg, index) => <Category index={index} />)
                                    }
                                </div></>
                        }
                    </> : <M3uList
                        finalAddress={finalAddress}
                        currentAction={currentAction} />
            }


        </div >

    )
}

export default AllList;
