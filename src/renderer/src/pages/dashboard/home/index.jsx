import { AppContext } from '../../../contexts/app'
// import Link from 'next/link';
import React, { useContext, useEffect, useState, useRef } from 'react'
// import { Grid, List } from 'react-virtualized';
import placeholderImage from "../../../assets/placeholder.png"
// import Image from 'next/image';
// import { useRouter } from 'next/router';
import { AES, enc } from 'crypto-js';
import { parse } from 'iptv-playlist-parser';
import axios from 'axios';
import Scrollable from '../../../helpers/scrollable';
import { getFavourites, getRecents } from '../../../firebase/functions';
import Loading from '../../../helpers/loading';
import { concatUrl } from '../../../helpers/methods/concatUrl';
// import Watched from '../../utils/progress';
import { getParentalPin } from '../../../helpers/local';
import DashboardHeader from '../header';
import ParentalLock from '../../../helpers/parentalLock'
import { createSearchParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, List } from 'react-virtualized';


const M3uList = ({ finalAddress, currentAction }) => {

    const [searchParams, setSearchParams] = useSearchParams();
    const router = useNavigate();
    // const { query } = router;
    // const view = searchParams.get("view");
    // const { view } = query;
    const containerRef = useRef(null);
    const { user, m3uStreams, m3uUrl, homeM3uStreams, parentalVerified, scrolled } = useContext(AppContext);
    const refs = useRef([]);
    const listImagesRef = useRef([]);
    let mouseDown = false;
    let startX, scrollLeft;
    const path = currentAction === "movies" ? "Movie" : "Series";

    const [movieCategories, setMovieCategories] = useState([]);
    const [seriesCategories, setSeriesCategories] = useState([]);
    const [liveCategories, setLiveCategories] = useState([]);
    const [clickedAdultItem, setClickedAdultItem] = useState(null);
    const [showParentalLock, setShowParentalLock] = useState(false);
    const [FavouriteMovies, setFavouriteMovies] = useState(null);
    const [recents, setRecents] = useState([]);
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0
    });
    const [parsedItems, setParsedItems] = useState(null);
    const [scrolledHeight, setScrolledHeight] = useState(0);
    const { movies, series, live } = m3uStreams.streams;

    useEffect(() => {
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
        });
    }, []);

    useEffect(() => {
        if (user && homeM3uStreams.streams) {
            getFavs();
        }
    }, [user, homeM3uStreams.streams]);

    useEffect(() => {
        if (parsedItems) {
            parsedItems.map(mov => setMovieCategories(prev => {
                const exist = prev.filter(ctg => ctg === mov.group.title).length > 0;
                const category = mov.group.title && mov.group.title.length > 0

                return (category && !exist) ? [...prev, mov.group.title] : prev
            }));

        }
    }, [parsedItems]);

    useEffect(() => {
        if (homeM3uStreams.streams && homeM3uStreams.streams.length > 0) {
            setParsedItems(homeM3uStreams.streams)
        } else {
            if (m3uUrl.url) {
                getM3uStreams();
            }
        }
    }, [homeM3uStreams.streams, m3uUrl]);

    const getM3uStreams = async () => {
        try {
            const response = await axios.get(m3uUrl.url);
            const parsedData = parse(response.data);
            const isValid = parsedData.items.filter(item => (item.group.title.length > 0) && (item.name.length > 0)).length > 0;

            if (parsedData && isValid) {
                const movies = parsedData.items.filter(item => item.url.includes('/movie/'));
                const series = parsedData.items.filter(item => item.url.includes('/series/'));
                const live = parsedData.items.filter(item => !item.url.includes('/movie/') && !item.url.includes('/series/'));

                m3uStreams.toggle(movies, series, live);
                homeM3uStreams.toggle(parsedData.items)

            }
        } catch (error) {
            console.log('ERROR', error)
        }
    };

    const getFavs = async (values) => {
        setFavouriteMovies(null)
        try {
            const response = await getFavourites('Home', user.dbAddress);
            const ids = response.val() && Object.keys(response.val());
            if (ids) {
                let favs = []
                ids.map(id => {
                    const itemExists = homeM3uStreams.streams.filter(movie => String(concatUrl(movie.url)) === String(id));
                    if (itemExists.length > 0) {
                        const item = {
                            id,
                            logo: itemExists[0].tvg.logo,
                            name: itemExists[0].tvg.name,
                            url: itemExists[0].url
                        }
                        favs.push(item);
                    }
                });
                setFavouriteMovies(favs)
            } else {
                setFavouriteMovies(null)
            }

        } catch (error) {
            console.log(error)
        }
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

    const parentalPin = getParentalPin("currentUser");


    const FavsCategory = ({ favMovies, style }) => {

        return favMovies && favMovies.length > 0 && <section
            style={style}
            className="category">
            <span style={{ marginTop: 20 }} className="h3">Favourites</span>
            <Scrollable>
                {favMovies?.map((movie, index) => {
                    const added = currentAction === "movies" ? movie.added : movie.last_modified;

                    return <Link href={
                        {
                            pathname: `/dashboard/home/player`,
                            query: {
                                id: movie.id,
                                stream: AES.encrypt(movie.url, 'thisisurl').toString(),
                                name: AES.encrypt(movie.name, 'thisisname').toString(),
                            }
                        }
                    }>
                        <div key={index} style={{ marginTop: 10, marginBottom: 10, width: 165, borderRadius: 5 }} className="item">
                            <div className="caption">
                                <span className="control">
                                    {(Number(movie.rating).toFixed(1) !== 'NaN' && Number(movie.rating) !== 0) ?
                                        <span className="count">{Number(movie.rating).toFixed(1)}</span> : <span></span>}
                                    <Link href="#"><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill="#FF0000" /> </svg></Link>
                                </span>
                                <span className="info">
                                    <text>{""}</text>
                                    {/* <text>{added && formattedDate(added)}</text> */}
                                </span>
                                <span className="h2">{movie.name}</span>
                            </div>
                            <div className="thumb">
                                {
                                    movie.logo ?
                                        <img src={
                                            movie.logo
                                        } /> :
                                        <img alt="placeholder" layout='fill' src={placeholderImage} />
                                }
                            </div>
                        </div>
                    </Link>
                })}
            </Scrollable>
        </section>
    };

    const adultArray = ["adult", "xxx", "porn", "sex", "adults", "ADULTS", "+18", "18+", "18"];

    const MovieCategory = ({ index, style, difference }) => {
        const filtered = parsedItems.filter(movie =>
            (movie.group.title === movieCategories[index - difference]))
            ;
        const [errorIndex, setErrorIndex] = useState([]);
        const innerElement = (args) => {

            const filteredComp = filtered[args.columnIndex];
            const category_name = filteredComp.group.title;
            const { name } = filteredComp;
            const movie_image = filteredComp.tvg.logo;
            // const { category_name, added, name, movie_image } = filteredComp;
            const isFavourite = FavouriteMovies && FavouriteMovies.filter(movie => movie.id === concatUrl(filteredComp.url)).length > 0;
            const category = [...movieCategories, ...seriesCategories, ...liveCategories][index];
            const isAdult = adultArray.filter(item => category.toLowerCase().includes(item.toLowerCase())).length > 0;
            const handleItem = () => {
                scrolled.toggle(index, 0, 0);

                if (parentalPin) {
                    if (isAdult) {
                        setClickedAdultItem(filteredComp);
                        setShowParentalLock(true);
                    } else {
                        setShowParentalLock(false);
                        router({
                            pathname: `/dashboard/home/player`,
                            search: createSearchParams({
                                id: getStreamIdFromUrl(filteredComp.url),
                                stream: AES.encrypt(filteredComp.url, 'thisisurl').toString(),
                                name: AES.encrypt(name, "thisisname").toString()
                            }).toString()
                        });
                    };
                } else {
                    router({
                        pathname: `/dashboard/home/player`,
                        search: createSearchParams({
                            id: getStreamIdFromUrl(filteredComp.url),
                            stream: AES.encrypt(filteredComp.url, 'thisisurl').toString(),
                            name: AES.encrypt(name, "thisisname").toString()
                        }).toString()
                    });
                }
            };

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
                                    <Link href="'#"><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill="#FF0000" /> </svg></Link>
                                }
                            </span>
                            <span className="info">
                                <text>{category_name}</text>
                                <text></text>
                            </span>
                            <span className="h2">{name}</span>
                        </div>
                        <div className="thumb">
                            {
                                errorIndex.filter(index => index === args.columnIndex).length > 0 ?
                                    <img alt="placeholder" src={placeholderImage} /> :
                                    movie_image ?

                                        <img
                                            onError={() => setErrorIndex(prev => [...prev, args.columnIndex])
                                            }
                                            style={{
                                                filter: (isAdult && parentalPin) && 'blur(20px)'
                                            }}
                                            src={
                                                movie_image
                                            }
                                            ref={(element) => listImagesRef.current[index] = element}
                                        />
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
        };

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

        return filtered.length > 0 && <section key={index} style={style} className="category listSlider">
            <span className="h3">{[...movieCategories, ...seriesCategories, ...liveCategories][index - difference]}</span>
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
                    ref={element => refs.current[index] = element}
                >
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
                        width={windowSize.width - (window.innerWidth / 20)}

                    />
                </div>


            </div>
        </section>
    };

    const renderRow = ({ index, key, style }) => {
        if (FavouriteMovies && FavouriteMovies.length > 0 && index === 0) {
            return <FavsCategory key={key} style={style} favMovies={FavouriteMovies} />
        };
        return <MovieCategory key={key} style={style} index={index} difference={(FavouriteMovies && FavouriteMovies.length > 0 && index === 0) ? 1 : 0} />
    };

    return (
        <>
            <DashboardHeader
                dataFetched={true}
                currentAction={"home"}
            />
            <div className='m3u-list-container' style={{
                // paddingTop: '90px'
            }}>
                <ParentalLock
                    action={"verify"}
                    open={showParentalLock}
                    close={() => setShowParentalLock(false)}
                    completed={() => {
                        parentalVerified.toggle(true);
                        router({
                            pathname: `/dashboard/home/player`,
                            search: createSearchParams({
                                id: getStreamIdFromUrl(clickedAdultItem.url),
                                stream: AES.encrypt(clickedAdultItem.url, 'thisisurl').toString(),
                                name: AES.encrypt(clickedAdultItem.tvg.name, "thisisname").toString()
                            }).toString()
                        });
                    }}
                />
                {
                    (parsedItems && movieCategories.length > 0) ?
                        <>
                            <List
                                ref={containerRef}
                                width={windowSize.width - 10}
                                className='categores-render-list'
                                height={windowSize.height}
                                scrollToIndex={scrolled.h}
                                rowHeight={350}
                                rowRenderer={renderRow}
                                rowCount={movieCategories?.length + ((FavouriteMovies && FavouriteMovies.length > 0) ? 1 : 0)}
                                overscanRowCount={3}
                            />

                        </> : <Loading />
                }
            </div>
        </>

    )
}

export default M3uList